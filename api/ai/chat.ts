import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdapter } from '../../lib/ai/adapters';
import type { AiAdapterMessage, AiContentPart, AiToolDefinition } from '../../lib/ai/adapters';
import { getAllToolDefinitions, getToolsByNames } from '../../lib/ai/tools';

const FIELD_DETECTION_SYSTEM_PROMPT = `You are a document field extraction assistant. Given OCR text from a document, identify all key fields and their values.

Return ONLY a JSON array of detected fields. Each field should have:
- "text": the extracted value as a string
- "confidence": 0-1 confidence score
- "fieldType": one of "invoice_number", "date", "total_amount", "subtotal", "tax", "name", "address", "phone", "email", "currency_amount", "unknown"
- "label": a human-readable label for the field
- "dataType": one of "string", "number", "date", "currency", "boolean"

Example response:
[{"text": "INV-2024-001", "confidence": 0.95, "fieldType": "invoice_number", "label": "Invoice Number", "dataType": "string"}]

Be thorough — extract all identifiable fields including dates, amounts, names, addresses, reference numbers, and any labeled key-value pairs.`;

const FREEFORM_SYSTEM_PROMPT = `You are a helpful assistant for a document processing application called Paper Bridge. You help users understand and work with their documents. When answering questions, be concise and specific. If document text is provided as context, reference it directly.

You have access to tools that let you inspect the canvas, view files, and interact with the document graph. Use them when you need context to answer questions.`;

const AUTO_CONNECT_SYSTEM_PROMPT = `You are a document processing assistant that analyses extracted fields across multiple document nodes and suggests connections between them.

Given a list of nodes with their fields (labels, data types, values), suggest connections where:
- Fields with matching or related names should be connected (e.g. "Total" in one document → "Amount" input in a calculation)
- Fields that represent the same entity across documents should be linked
- Numeric fields can feed into calculation nodes (sum, average, etc.)
- Label nodes can display values from extractor fields

Return ONLY a JSON array of connection suggestions. Each suggestion should have:
- "sourceNodeId": the node ID containing the source field
- "sourceFieldId": the field/region ID to connect from
- "targetNodeId": the node ID to connect to
- "targetHandle": the target handle name (for calculation nodes use the input handle pattern, for label nodes use "label-in")
- "reason": brief explanation of why these should be connected

Example: [{"sourceNodeId": "node-1", "sourceFieldId": "region-123", "targetNodeId": "node-2", "targetHandle": "input-0", "reason": "Invoice total feeds into sum calculation"}]

Be conservative — only suggest connections that make semantic sense.`;

const SUMMARISE_SYSTEM_PROMPT = `You are a document processing assistant. Given OCR text or field data from documents, provide a concise summary that covers:
- Document type (invoice, receipt, contract, etc.)
- Key entities (people, companies, dates)
- Important values (totals, amounts, reference numbers)
- Any notable observations

Keep the summary brief (3-5 bullet points). Use plain language.`;

interface ChatRequestBody {
  provider: string;
  model: string;
  apiKey: string;
  mode: 'detect_fields' | 'freeform' | 'auto_connect' | 'summarise';
  ocrText?: string;
  nodesContext?: Array<{
    nodeId: string;
    nodeType: string;
    label: string;
    fields: Array<{ id: string; label: string; dataType: string; value?: string }>;
  }>;
  messages: Array<{
    role: 'user' | 'assistant' | 'tool_result';
    content: string;
    toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
    toolResults?: Array<{ toolCallId: string; content: Array<{ type: 'text' | 'image'; text?: string; mimeType?: string; base64?: string }> }>;
  }>;
  images?: Array<{ mimeType: string; base64: string }>;
  tools?: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as ChatRequestBody;
  const { provider, model, apiKey, mode, ocrText, messages } = body;

  if (!provider || !model || !apiKey || !messages?.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const systemPromptMap: Record<string, string> = {
    detect_fields: FIELD_DETECTION_SYSTEM_PROMPT,
    freeform: FREEFORM_SYSTEM_PROMPT,
    auto_connect: AUTO_CONNECT_SYSTEM_PROMPT,
    summarise: SUMMARISE_SYSTEM_PROMPT,
  };
  const systemPrompt = systemPromptMap[mode] ?? FREEFORM_SYSTEM_PROMPT;

  // Build context string from OCR text and/or node descriptions
  let contextBlock = '';
  if (ocrText) {
    contextBlock += `Document OCR text:\n---\n${ocrText}\n---\n\n`;
  }
  if (body.nodesContext?.length) {
    contextBlock += `Canvas nodes:\n---\n${JSON.stringify(body.nodesContext, null, 2)}\n---\n\n`;
  }

  // Convert messages to adapter format
  const adapterMessages: AiAdapterMessage[] = messages.map((m, i) => {
    if (m.role === 'tool_result') {
      return {
        role: 'tool_result' as const,
        content: '',
        toolResults: m.toolResults?.map((tr) => ({
          toolCallId: tr.toolCallId,
          content: tr.content as AiContentPart[],
        })),
      };
    }

    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant' as const,
        content: m.content,
        toolCalls: m.toolCalls,
      };
    }

    // User message — prepend context to the first one
    if (i === 0 && m.role === 'user' && contextBlock) {
      const contentParts: AiContentPart[] = [
        { type: 'text', text: contextBlock + m.content },
      ];
      // Attach images to first user message
      if (body.images?.length) {
        for (const img of body.images) {
          contentParts.push({ type: 'image', mimeType: img.mimeType, base64: img.base64 });
        }
      }
      return { role: 'user' as const, content: contentParts };
    }

    return { role: m.role as 'user' | 'assistant', content: m.content };
  });

  // Resolve tool definitions
  let toolDefs: AiToolDefinition[] | undefined;
  if (body.tools?.length) {
    toolDefs = getToolsByNames(body.tools);
  } else if (mode === 'freeform') {
    // Freeform mode always has tools available
    toolDefs = getAllToolDefinitions();
  }

  try {
    const adapter = getAdapter(provider);
    const response = await adapter.call({
      model,
      apiKey,
      systemPrompt,
      messages: adapterMessages,
      tools: toolDefs,
      maxTokens: 4096,
    });

    return res.status(200).json({
      content: response.content,
      toolCalls: response.toolCalls,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status =
      message.includes('401') || message.includes('auth') ? 401 : 500;
    return res.status(status).json({ error: message });
  }
}
