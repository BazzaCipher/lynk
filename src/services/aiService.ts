import type { AiChatRequest, AiDetectedField, AiMessage, ProviderId } from '../types/ai';

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
