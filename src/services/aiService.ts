import type { AiChatRequest, AiDetectedField, AiConnectionSuggestion, AiMessage, AiNodeContext, ProviderId, AiToolCall } from '../types/ai';
import { executeToolCall } from './ai/toolExecutor';
import type { OcrWord } from '../core/extraction/ocrExtractor';

const API_URL = '/api/ai/chat';

interface AiResponse {
  content: string;
  toolCalls?: AiToolCall[];
}

async function callAiRaw(request: AiChatRequest): Promise<AiResponse> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }

  return res.json();
}

/** Stream AI text response, calling onChunk for each text delta */
async function callAiStream(
  request: AiChatRequest,
  onChunk: (text: string) => void,
  onToolCall?: (toolName: string) => void,
): Promise<{ text: string; toolCalls?: AiToolCall[] }> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let toolCalls: AiToolCall[] | undefined;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'text') {
          fullText += parsed.text;
          onChunk(parsed.text);
        } else if (parsed.type === 'tool_calls') {
          toolCalls = parsed.toolCalls;
          for (const tc of parsed.toolCalls) {
            onToolCall?.(tc.name);
          }
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return { text: fullText, toolCalls };
}

/** Call AI with automatic tool-call loop. Executes tools client-side until the model returns a text response. */
async function callAi(
  request: AiChatRequest,
  onToolCall?: (toolName: string) => void,
  maxRounds = 10
): Promise<string> {
  let messages = [...request.messages];
  let round = 0;

  while (round < maxRounds) {
    const response = await callAiRaw({ ...request, messages });

    if (!response.toolCalls?.length) {
      return response.content;
    }

    // Execute tools client-side
    const toolResults = await Promise.all(
      response.toolCalls.map(async (tc) => {
        onToolCall?.(tc.name);
        return executeToolCall(tc.id, tc.name, tc.arguments);
      })
    );

    // Append assistant message with tool calls, then tool results
    messages = [
      ...messages,
      {
        role: 'assistant' as const,
        content: response.content,
        toolCalls: response.toolCalls,
      },
      {
        role: 'tool_result' as const,
        content: '',
        toolResults: toolResults.map((tr) => ({
          toolCallId: tr.toolCallId,
          content: tr.content.map((c) => ({
            type: c.type,
            ...(c.type === 'text' ? { text: c.text } : { mimeType: c.mimeType, base64: c.base64 }),
          })),
        })),
      },
    ];

    round++;
  }

  throw new Error('Tool call loop exceeded maximum rounds');
}

export interface DetectFieldsOptions {
  /** Base64-encoded images to send directly (for small images) */
  images?: Array<{ mimeType: string; base64: string }>;
  /** OCR words with bounding boxes (fallback for large images) */
  ocrWords?: OcrWord[];
  /** Raw OCR text (legacy fallback) */
  ocrText?: string;
}

export async function detectFieldsWithAI(
  options: DetectFieldsOptions,
  provider: ProviderId,
  model: string,
  apiKey: string
): Promise<AiDetectedField[]> {
  const { images, ocrWords, ocrText } = options;

  let userContent = 'Detect all fields in this document. Be thorough — extract every field you can identify, including table rows as separate line items.';
  if (ocrWords?.length) {
    // Send structured OCR data with spatial info for better bbox computation
    const ocrData = ocrWords.map((w) => ({
      t: w.text,
      c: Math.round(w.confidence),
      b: [w.bbox.x0, w.bbox.y0, w.bbox.x1, w.bbox.y1],
    }));
    userContent += `\n\nOCR words (t=text, c=confidence, b=[x0,y0,x1,y1]):\n${JSON.stringify(ocrData)}`;
  }

  const content = await callAi({
    provider,
    model,
    apiKey,
    mode: 'detect_fields',
    ocrText: !images?.length ? ocrText : undefined,
    messages: [{ role: 'user', content: userContent }],
    images: images,
  });

  const jsonStr = content.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
  try {
    const fields = JSON.parse(jsonStr);
    if (!Array.isArray(fields)) throw new Error('Expected array');
    return fields;
  } catch {
    throw new Error('Failed to parse AI response as field data');
  }
}

export interface AskAIOptions {
  onChunk?: (text: string) => void;
  onToolCall?: (toolName: string) => void;
  stream?: boolean;
}

export async function askAI(
  question: string,
  ocrText: string | undefined,
  provider: ProviderId,
  model: string,
  apiKey: string,
  history: AiMessage[] = [],
  optionsOrOnToolCall?: AskAIOptions | ((toolName: string) => void),
): Promise<string> {
  // Support old signature (onToolCall callback) and new options object
  const opts: AskAIOptions = typeof optionsOrOnToolCall === 'function'
    ? { onToolCall: optionsOrOnToolCall }
    : optionsOrOnToolCall ?? {};

  const request: AiChatRequest = {
    provider,
    model,
    apiKey,
    mode: 'freeform',
    ocrText,
    messages: [...history, { role: 'user', content: question }],
  };

  if (opts.stream && opts.onChunk) {
    const result = await callAiStream(request, opts.onChunk, opts.onToolCall);

    // If there were tool calls, fall back to non-streaming loop for tool execution
    if (result.toolCalls?.length) {
      return callAi(request, opts.onToolCall);
    }

    return result.text;
  }

  return callAi(request, opts.onToolCall);
}

export async function autoConnectWithAI(
  nodesContext: AiNodeContext[],
  provider: ProviderId,
  model: string,
  apiKey: string
): Promise<AiConnectionSuggestion[]> {
  const content = await callAi({
    provider,
    model,
    apiKey,
    mode: 'auto_connect',
    nodesContext,
    messages: [{ role: 'user', content: 'Analyse these nodes and suggest connections between matching fields.' }],
  });

  const jsonStr = content.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
  try {
    const suggestions = JSON.parse(jsonStr);
    if (!Array.isArray(suggestions)) throw new Error('Expected array');
    return suggestions;
  } catch {
    throw new Error('Failed to parse AI connection suggestions');
  }
}

export async function summariseWithAI(
  ocrText: string | undefined,
  nodesContext: AiNodeContext[] | undefined,
  provider: ProviderId,
  model: string,
  apiKey: string
): Promise<string> {
  return callAi({
    provider,
    model,
    apiKey,
    mode: 'summarise',
    ocrText,
    nodesContext,
    messages: [{ role: 'user', content: 'Summarise the documents and fields on this canvas.' }],
  });
}

/** Verify an API key by making a minimal request */
export async function verifyApiKey(
  provider: ProviderId,
  model: string,
  apiKey: string
): Promise<boolean> {
  try {
    await callAiRaw({
      provider,
      model,
      apiKey,
      mode: 'freeform',
      messages: [{ role: 'user', content: 'Hi' }],
    });
    return true;
  } catch {
    return false;
  }
}
