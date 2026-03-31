import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI, type Content, type Part, type FunctionDeclaration, SchemaType } from '@google/generative-ai';

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type AiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; base64: string };

interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface AiToolResult {
  toolCallId: string;
  content: AiContentPart[];
}

interface AiAdapterMessage {
  role: 'user' | 'assistant' | 'tool_result';
  content: AiContentPart[] | string;
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
}

interface AiAdapterRequest {
  model: string;
  apiKey: string;
  systemPrompt: string;
  messages: AiAdapterMessage[];
  tools?: AiToolDefinition[];
  maxTokens?: number;
}

interface AiAdapterResponse {
  content: string;
  toolCalls?: AiToolCall[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTHROPIC ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

type AnthropicToolResultContent = Anthropic.TextBlockParam | Anthropic.ImageBlockParam;

function toAnthropicContent(parts: AiContentPart[]): AnthropicToolResultContent[] {
  return parts.map((p): AnthropicToolResultContent => {
    if (p.type === 'text') return { type: 'text' as const, text: p.text };
    return {
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: p.mimeType as Anthropic.Base64ImageSource['media_type'], data: p.base64 },
    };
  });
}

function toAnthropicMessages(messages: AiAdapterMessage[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];
  for (const msg of messages) {
    if (msg.role === 'tool_result' && msg.toolResults) {
      result.push({
        role: 'user',
        content: msg.toolResults.map((tr) => ({
          type: 'tool_result' as const,
          tool_use_id: tr.toolCallId,
          content: toAnthropicContent(tr.content),
        })),
      });
    } else if (msg.role === 'assistant' && msg.toolCalls?.length) {
      const content: Anthropic.ContentBlockParam[] = [];
      if (typeof msg.content === 'string' && msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
      }
      result.push({ role: 'assistant', content });
    } else {
      const content = typeof msg.content === 'string' ? msg.content : toAnthropicContent(msg.content);
      result.push({ role: msg.role as 'user' | 'assistant', content });
    }
  }
  return result;
}

function toAnthropicTools(tools: AiToolDefinition[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool['input_schema'],
  }));
}

async function callAnthropic(request: AiAdapterRequest): Promise<AiAdapterResponse> {
  const client = new Anthropic({ apiKey: request.apiKey });
  const params: Anthropic.MessageCreateParams = {
    model: request.model,
    max_tokens: request.maxTokens ?? 4096,
    system: request.systemPrompt,
    messages: toAnthropicMessages(request.messages),
  };
  if (request.tools?.length) {
    params.tools = toAnthropicTools(request.tools);
  }
  const response = await client.messages.create(params);
  const textParts: string[] = [];
  const toolCalls: AiToolCall[] = [];
  for (const block of response.content) {
    if (block.type === 'text') textParts.push(block.text);
    else if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id, name: block.name, arguments: block.input as Record<string, unknown> });
    }
  }
  return { content: textParts.join(''), toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPENAI ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

function toOpenAIContent(parts: AiContentPart[]): OpenAI.ChatCompletionContentPart[] {
  return parts.map((p) => {
    if (p.type === 'text') return { type: 'text' as const, text: p.text };
    return { type: 'image_url' as const, image_url: { url: `data:${p.mimeType};base64,${p.base64}` } };
  });
}

function toOpenAIMessages(systemPrompt: string, messages: AiAdapterMessage[]): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }];
  for (const msg of messages) {
    if (msg.role === 'tool_result' && msg.toolResults) {
      for (const tr of msg.toolResults) {
        const textContent = tr.content
          .map((p) => (p.type === 'text' ? p.text : `[image: data:${p.mimeType};base64,...]`))
          .join('\n');
        result.push({ role: 'tool', tool_call_id: tr.toolCallId, content: textContent });
      }
    } else if (msg.role === 'assistant' && msg.toolCalls?.length) {
      result.push({
        role: 'assistant',
        content: typeof msg.content === 'string' ? msg.content : null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id, type: 'function' as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      });
    } else {
      const content = typeof msg.content === 'string' ? msg.content : toOpenAIContent(msg.content);
      result.push({ role: msg.role as 'user' | 'assistant', content } as OpenAI.ChatCompletionMessageParam);
    }
  }
  return result;
}

function toOpenAITools(tools: AiToolDefinition[]): OpenAI.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

async function callOpenAI(request: AiAdapterRequest): Promise<AiAdapterResponse> {
  const client = new OpenAI({ apiKey: request.apiKey });
  const params: OpenAI.ChatCompletionCreateParams = {
    model: request.model,
    max_tokens: request.maxTokens ?? 4096,
    messages: toOpenAIMessages(request.systemPrompt, request.messages),
  };
  if (request.tools?.length) params.tools = toOpenAITools(request.tools);
  const response = await client.chat.completions.create(params);
  const message = response.choices[0]?.message;
  const toolCalls: AiToolCall[] = [];
  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      if (tc.type === 'function') {
        const fn = tc as { id: string; type: 'function'; function: { name: string; arguments: string } };
        toolCalls.push({ id: fn.id, name: fn.function.name, arguments: JSON.parse(fn.function.arguments) });
      }
    }
  }
  return { content: message?.content ?? '', toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GEMINI ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

function toGeminiParts(parts: AiContentPart[]): Part[] {
  return parts.map((p): Part => {
    if (p.type === 'text') return { text: p.text } as Part;
    return { inlineData: { mimeType: p.mimeType, data: p.base64 } } as Part;
  });
}

function toGeminiContents(messages: AiAdapterMessage[]): Content[] {
  const contents: Content[] = [];
  for (const msg of messages) {
    if (msg.role === 'tool_result' && msg.toolResults) {
      for (const tr of msg.toolResults) {
        const textContent = tr.content
          .filter((p): p is Extract<AiContentPart, { type: 'text' }> => p.type === 'text')
          .map((p) => p.text).join('\n');
        contents.push({
          role: 'function',
          parts: [{ functionResponse: { name: tr.toolCallId, response: { result: textContent } } }],
        });
      }
    } else if (msg.role === 'assistant') {
      const parts: Part[] = [];
      if (typeof msg.content === 'string' && msg.content) parts.push({ text: msg.content });
      else if (Array.isArray(msg.content)) parts.push(...toGeminiParts(msg.content));
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
      }
      contents.push({ role: 'model', parts });
    } else {
      const parts = typeof msg.content === 'string' ? [{ text: msg.content }] : toGeminiParts(msg.content);
      contents.push({ role: 'user', parts });
    }
  }
  return contents;
}

function jsonSchemaToGemini(schema: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...schema };
  if (schema.type === 'object') result.type = SchemaType.OBJECT;
  else if (schema.type === 'string') result.type = SchemaType.STRING;
  else if (schema.type === 'number' || schema.type === 'integer') result.type = SchemaType.NUMBER;
  else if (schema.type === 'boolean') result.type = SchemaType.BOOLEAN;
  else if (schema.type === 'array') result.type = SchemaType.ARRAY;
  if (schema.properties && typeof schema.properties === 'object') {
    const props: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
      props[key] = jsonSchemaToGemini(val);
    }
    result.properties = props;
  }
  if (schema.items && typeof schema.items === 'object') {
    result.items = jsonSchemaToGemini(schema.items as Record<string, unknown>);
  }
  return result;
}

async function callGemini(request: AiAdapterRequest): Promise<AiAdapterResponse> {
  const genAI = new GoogleGenerativeAI(request.apiKey);
  const geminiTools = request.tools?.length
    ? request.tools.map((t) => ({
        name: t.name, description: t.description,
        parameters: jsonSchemaToGemini(t.parameters) as unknown as FunctionDeclaration['parameters'],
      }))
    : undefined;
  const model = genAI.getGenerativeModel({
    model: request.model,
    systemInstruction: request.systemPrompt,
    ...(geminiTools ? { tools: [{ functionDeclarations: geminiTools }] } : {}),
  });
  const contents = toGeminiContents(request.messages);
  const result = await model.generateContent({ contents });
  const response = result.response;
  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) {
    return { content: response.text?.() ?? '' };
  }
  const textParts: string[] = [];
  const toolCalls: AiToolCall[] = [];
  for (const part of candidate.content.parts) {
    if ('text' in part && part.text) textParts.push(part.text);
    else if ('functionCall' in part && part.functionCall) {
      toolCalls.push({
        id: part.functionCall.name, name: part.functionCall.name,
        arguments: (part.functionCall.args ?? {}) as Record<string, unknown>,
      });
    }
  }
  return { content: textParts.join(''), toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER DISPATCH
// ═══════════════════════════════════════════════════════════════════════════════

const adapters: Record<string, (req: AiAdapterRequest) => Promise<AiAdapterResponse>> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  gemini: callGemini,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TOOL_DEFINITIONS: AiToolDefinition[] = [
  {
    name: 'get_canvas_graph',
    description: 'Get the simplified canvas graph: all nodes (id, type, label, fields summary) and edges (source→target with handles). Use this to understand the current document processing layout.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_node_details',
    description: 'Get full details for a specific node: regions with coordinates, extracted values, data types, and confidence scores.',
    parameters: { type: 'object', properties: { nodeId: { type: 'string', description: 'The node ID to get details for' } }, required: ['nodeId'] },
  },
  {
    name: 'get_file_list',
    description: 'Get the list of files in the project: name, MIME type, size, and associated node ID.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_file_content',
    description: "Get a file's content. Returns the file as a base64 image (for images) or OCR text (for PDFs). Use this to visually inspect documents.",
    parameters: { type: 'object', properties: { fileId: { type: 'string', description: 'The file ID to retrieve' } }, required: ['fileId'] },
  },
  {
    name: 'suggest_connection',
    description: 'Propose a connection between two nodes on the canvas.',
    parameters: {
      type: 'object',
      properties: {
        sourceNodeId: { type: 'string', description: 'Source node ID' },
        sourceFieldId: { type: 'string', description: 'Source field/region ID (used as output handle)' },
        targetNodeId: { type: 'string', description: 'Target node ID' },
        targetHandle: { type: 'string', description: 'Target handle name (e.g. "input-0", "label-in")' },
        reason: { type: 'string', description: 'Brief reason for this connection' },
      },
      required: ['sourceNodeId', 'sourceFieldId', 'targetNodeId', 'targetHandle', 'reason'],
    },
  },
  {
    name: 'create_region',
    description: 'Create an extraction region on an extractor node to extract a field from the document.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'Extractor node ID' },
        x: { type: 'number', description: 'X coordinate (pixels from left)' },
        y: { type: 'number', description: 'Y coordinate (pixels from top)' },
        width: { type: 'number', description: 'Region width in pixels' },
        height: { type: 'number', description: 'Region height in pixels' },
        label: { type: 'string', description: 'Human-readable label for the field' },
        dataType: { type: 'string', description: 'Data type: "string", "number", "date", "currency", or "boolean"' },
      },
      required: ['nodeId', 'x', 'y', 'width', 'height', 'label', 'dataType'],
    },
  },
];

function getAllToolDefinitions(): AiToolDefinition[] {
  return TOOL_DEFINITIONS;
}

function getToolsByNames(names: string[]): AiToolDefinition[] {
  const toolMap = new Map(TOOL_DEFINITIONS.map((t) => [t.name, t]));
  return names.map((n) => toolMap.get(n)).filter((t): t is AiToolDefinition => !!t);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

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
    toolDefs = getAllToolDefinitions();
  }

  try {
    const adapter = adapters[provider];
    if (!adapter) {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    const response = await adapter({
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
