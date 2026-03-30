import type { AiChatRequest, AiDetectedField, AiConnectionSuggestion, AiMessage, AiNodeContext, ProviderId, AiToolCall } from '../types/ai';
import { executeToolCall } from './ai/toolExecutor';

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

export async function detectFieldsWithAI(
  ocrText: string,
  provider: ProviderId,
  model: string,
  apiKey: string
): Promise<AiDetectedField[]> {
  const content = await callAi({
    provider,
    model,
    apiKey,
    mode: 'detect_fields',
    ocrText,
    messages: [{ role: 'user', content: 'Detect all fields in this document.' }],
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

export async function askAI(
  question: string,
  ocrText: string | undefined,
  provider: ProviderId,
  model: string,
  apiKey: string,
  history: AiMessage[] = [],
  onToolCall?: (toolName: string) => void
): Promise<string> {
  return callAi(
    {
      provider,
      model,
      apiKey,
      mode: 'freeform',
      ocrText,
      messages: [...history, { role: 'user', content: question }],
    },
    onToolCall
  );
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
