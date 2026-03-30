import type { AiProviderAdapter } from './types';
import { anthropicAdapter } from './anthropic';
import { openaiAdapter } from './openai';
import { geminiAdapter } from './gemini';

const adapters: Record<string, AiProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  gemini: geminiAdapter,
};

export function getAdapter(provider: string): AiProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) throw new Error(`Unknown provider: ${provider}`);
  return adapter;
}

export type { AiProviderAdapter, AiAdapterRequest, AiAdapterResponse, AiAdapterMessage, AiContentPart, AiToolDefinition, AiToolCall, AiToolResult } from './types';
