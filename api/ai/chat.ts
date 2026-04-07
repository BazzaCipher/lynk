import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateText, streamText, tool, Output } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface AiContentPart {
  type: 'text' | 'image';
  text?: string;
  mimeType?: string;
  base64?: string;
}

interface AiToolResult {
  toolCallId: string;
  content: AiContentPart[];
}

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
    toolCalls?: AiToolCall[];
    toolResults?: AiToolResult[];
  }>;
  images?: Array<{ mimeType: string; base64: string }>;
  tools?: string[];
  stream?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/** Map provider+model to a gateway model slug */
function resolveModel(provider: string, model: string, _apiKey: string) {
  const slugMap: Record<string, string> = {
    anthropic: 'anthropic',
    openai: 'openai',
    gemini: 'google',
  };

  const prefix = slugMap[provider];
  if (!prefix) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // Route through gateway with BYO API key via providerOptions
  // The gateway slug format is "provider/model-id"
  return gateway(`${prefix}/${model}` as Parameters<typeof gateway>[0]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS (AI SDK format)
// ═══════════════════════════════════════════════════════════════════════════════

const TOOL_DEFS = {
  get_canvas_graph: tool({
    description:
      'Get the simplified canvas graph: all nodes (id, type, label, fields summary) and edges (source→target with handles). Use this to understand the current document processing layout.',
    inputSchema: z.object({}),
  }),

  get_node_details: tool({
    description:
      'Get full details for a specific node: regions with coordinates, extracted values, data types, and confidence scores.',
    inputSchema: z.object({
      nodeId: z.string().describe('The node ID to get details for'),
    }),
  }),

  get_file_list: tool({
    description:
      'Get the list of files in the project: name, MIME type, size, and associated node ID.',
    inputSchema: z.object({}),
  }),

  get_file_content: tool({
    description:
      "Get a file's content. Returns the file as a base64 image (for images) or OCR text (for PDFs). Use this to visually inspect documents.",
    inputSchema: z.object({
      fileId: z.string().describe('The file ID to retrieve'),
    }),
  }),

  suggest_connection: tool({
    description: 'Propose a connection between two nodes on the canvas.',
    inputSchema: z.object({
      sourceNodeId: z.string().describe('Source node ID'),
      sourceFieldId: z.string().describe('Source field/region ID (used as output handle)'),
      targetNodeId: z.string().describe('Target node ID'),
      targetHandle: z.string().describe('Target handle name (e.g. "inputs" for calculation nodes, "input" for label nodes)'),
      reason: z.string().describe('Brief reason for this connection'),
    }),
  }),

  create_region: tool({
    description: 'Create an extraction region on an extractor node to extract a field from the document.',
    inputSchema: z.object({
      nodeId: z.string().describe('Extractor node ID'),
      x: z.number().describe('X coordinate (pixels from left)'),
      y: z.number().describe('Y coordinate (pixels from top)'),
      width: z.number().describe('Region width in pixels'),
      height: z.number().describe('Region height in pixels'),
      label: z.string().describe('Human-readable label for the field'),
      dataType: z.string().describe('Data type: "string", "number", "date", "currency", or "boolean"'),
    }),
  }),
};

type ToolName = keyof typeof TOOL_DEFS;

function getTools(names?: string[]) {
  if (!names?.length) return TOOL_DEFS;
  const result: Partial<typeof TOOL_DEFS> = {};
  for (const name of names) {
    if (name in TOOL_DEFS) {
      result[name as ToolName] = TOOL_DEFS[name as ToolName];
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const FIELD_DETECTION_SYSTEM_PROMPT = `You are a document field extraction assistant. You may receive a document image directly (use your vision to read it) or OCR text/word data. Identify all key fields and their values from whatever input is provided.

Return ONLY a JSON array of detected fields. Each field must have:
- "text": the extracted value as a string
- "confidence": 0-1 confidence score
- "fieldType": one of "invoice_number", "date", "total_amount", "subtotal", "tax", "name", "address", "phone", "email", "currency_amount", "line_item", "quantity", "unit_price", "description", "payment_terms", "due_date", "account_number", "reference", "unknown"
- "label": a human-readable label for the field
- "dataType": one of "string", "number", "date", "currency", "boolean"
- "bbox": (when OCR word data with bounding boxes is provided) approximate bounding box as {"x": number, "y": number, "width": number, "height": number} in pixels — group nearby words that form one value into a single bbox

When OCR word data with bounding boxes is provided:
1. Use spatial relationships: labels are typically left-of or above their values
2. Group words on the same line into coherent phrases
3. Identify table structures by detecting aligned columns
4. For each field, compute a bounding box that tightly covers the VALUE (not the label)
5. Use word confidence scores to inform your field-level confidence

Be thorough — extract ALL identifiable fields including line items in tables, dates, amounts, names, addresses, reference numbers, payment terms, and any labeled key-value pairs. For tables, extract each row as separate line_item entries.`;

const FREEFORM_SYSTEM_PROMPT = `You are a helpful assistant for a document processing application called Paper Bridge. Your primary goal is to help users understand their document data — what it contains, what it represents, and how different pieces of information relate to each other.

When answering questions:
- Focus on the actual data and its business meaning: totals, dates, parties involved, what the document is for
- Provide a complete overview of the data when asked — summarise key facts, relationships between values, and anything noteworthy
- Do NOT describe internal application mechanics like extractor nodes, regions, handles, or graph structure — the user cares about their documents, not the app's internals
- Be concise and reference specific values from the documents when possible

You have access to tools that let you inspect files, view document content, and understand the canvas layout. Use them proactively to give informed answers.`;

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
- "targetHandle": the target handle name (for calculation nodes use "inputs", for label nodes use "input")
- "reason": brief explanation of why these should be connected

Be conservative — only suggest connections that make semantic sense.`;

const SUMMARISE_SYSTEM_PROMPT = `You are a document processing assistant. Given OCR text or field data from documents, provide a concise summary that covers:
- Document type (invoice, receipt, contract, etc.)
- Key entities (people, companies, dates)
- Important values (totals, amounts, reference numbers)
- Any notable observations

Keep the summary brief (3-5 bullet points). Use plain language.`;

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE CONVERSION
// ═══════════════════════════════════════════════════════════════════════════════

type ModelMessage = Parameters<typeof generateText>[0]['messages'] extends infer T
  ? T extends Array<infer U> ? U : never
  : never;

function toModelMessages(
  messages: ChatRequestBody['messages'],
  contextBlock: string,
  images?: ChatRequestBody['images']
): ModelMessage[] {
  const result: ModelMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === 'tool_result' && msg.toolResults) {
      for (const tr of msg.toolResults) {
        const textContent = tr.content
          .map((p) => (p.type === 'text' ? p.text : `[image]`))
          .join('\n');
        result.push({
          role: 'tool' as const,
          content: [{
            type: 'tool-result' as const,
            toolCallId: tr.toolCallId,
            toolName: '', // filled by SDK from context
            result: textContent,
          }],
        });
      }
      continue;
    }

    if (msg.role === 'assistant' && msg.toolCalls?.length) {
      result.push({
        role: 'assistant' as const,
        content: [
          ...(msg.content ? [{ type: 'text' as const, text: msg.content }] : []),
          ...msg.toolCalls.map((tc) => ({
            type: 'tool-call' as const,
            toolCallId: tc.id,
            toolName: tc.name,
            args: tc.arguments,
          })),
        ],
      });
      continue;
    }

    if (msg.role === 'user') {
      // First user message gets context block + images prepended
      if (i === 0 && (contextBlock || images?.length)) {
        const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string }> = [];
        if (contextBlock) {
          content.push({ type: 'text', text: contextBlock + msg.content });
        } else {
          content.push({ type: 'text', text: msg.content });
        }
        if (images?.length) {
          for (const img of images) {
            content.push({
              type: 'image',
              image: img.base64,
              mimeType: img.mimeType,
            });
          }
        }
        result.push({ role: 'user' as const, content });
      } else {
        result.push({ role: 'user' as const, content: msg.content });
      }
      continue;
    }

    // Plain assistant text
    result.push({ role: 'assistant' as const, content: msg.content });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as ChatRequestBody;
  const { provider, model: modelId, apiKey, mode, ocrText, messages } = body;

  if (!provider || !modelId || !messages?.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing API key' });
  }

  const systemPromptMap: Record<string, string> = {
    detect_fields: FIELD_DETECTION_SYSTEM_PROMPT,
    freeform: FREEFORM_SYSTEM_PROMPT,
    auto_connect: AUTO_CONNECT_SYSTEM_PROMPT,
    summarise: SUMMARISE_SYSTEM_PROMPT,
  };
  const system = systemPromptMap[mode] ?? FREEFORM_SYSTEM_PROMPT;

  // Build context string
  let contextBlock = '';
  if (ocrText) {
    contextBlock += `Document OCR text:\n---\n${ocrText}\n---\n\n`;
  }
  if (body.nodesContext?.length) {
    contextBlock += `Canvas nodes:\n---\n${JSON.stringify(body.nodesContext, null, 2)}\n---\n\n`;
  }

  // Resolve tools — only for freeform mode or explicit tool list
  let tools: Record<string, ReturnType<typeof tool>> | undefined;
  if (body.tools?.length) {
    tools = getTools(body.tools);
  } else if (mode === 'freeform') {
    tools = getTools();
  }

  try {
    const resolvedModel = resolveModel(provider, modelId, apiKey);
    const modelMessages = toModelMessages(messages, contextBlock, body.images);

    // Streaming response for freeform chat
    if (body.stream && mode === 'freeform') {
      const result = streamText({
        model: resolvedModel,
        system,
        messages: modelMessages,
        tools,
        maxOutputTokens: 4096,
        providerOptions: { [provider === 'gemini' ? 'google' : provider]: { apiKey } },
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of result.textStream) {
        res.write(`data: ${JSON.stringify({ type: 'text', text: chunk })}\n\n`);
      }

      const finalResult = await result;
      const toolCalls = finalResult.toolCalls?.length
        ? finalResult.toolCalls.map((tc) => ({
            id: tc.toolCallId,
            name: tc.toolName,
            arguments: tc.args,
          }))
        : undefined;

      if (toolCalls) {
        res.write(`data: ${JSON.stringify({ type: 'tool_calls', toolCalls })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Non-streaming response
    const result = await generateText({
      model: resolvedModel,
      system,
      messages: modelMessages,
      tools,
      maxOutputTokens: 4096,
    });

    const toolCalls = result.toolCalls?.length
      ? result.toolCalls.map((tc) => ({
          id: tc.toolCallId,
          name: tc.toolName,
          arguments: tc.args,
        }))
      : undefined;

    return res.status(200).json({
      content: result.text,
      toolCalls,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status =
      message.includes('401') || message.includes('auth') ? 401
      : message.includes('429') ? 429
      : 500;
    return res.status(status).json({ error: message });
  }
}
