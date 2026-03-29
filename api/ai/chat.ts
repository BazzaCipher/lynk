import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

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

const FREEFORM_SYSTEM_PROMPT = `You are a helpful assistant for a document processing application called Paper Bridge. You help users understand and work with their documents. When answering questions, be concise and specific. If document text is provided as context, reference it directly.`;

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
  provider: 'anthropic' | 'openai';
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
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
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

  // Prepend context to the first user message if available
  const enrichedMessages = messages.map((m, i) => {
    if (i === 0 && m.role === 'user' && contextBlock) {
      return { ...m, content: contextBlock + m.content };
    }
    return m;
  });

  try {
    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: enrichedMessages,
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return res.status(200).json({ content: text });
    }

    if (provider === 'openai') {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          ...enrichedMessages,
        ],
      });
      const text = response.choices[0]?.message?.content ?? '';
      return res.status(200).json({ content: text });
    }

    return res.status(400).json({ error: `Unknown provider: ${provider}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status =
      message.includes('401') || message.includes('auth') ? 401 : 500;
    return res.status(status).json({ error: message });
  }
}
