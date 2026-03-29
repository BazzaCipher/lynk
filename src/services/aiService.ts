import type { AiChatRequest, AiDetectedField, AiConnectionSuggestion, AiMessage, AiNodeContext, ProviderId } from '../types/ai';

const API_URL = '/api/ai/chat';

async function callAi(request: AiChatRequest): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content;
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

  // Parse JSON from response (handle markdown code blocks)
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
  history: AiMessage[] = []
): Promise<string> {
  return callAi({
    provider,
    model,
    apiKey,
    mode: 'freeform',
    ocrText,
    messages: [...history, { role: 'user', content: question }],
  });
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
    await callAi({
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
