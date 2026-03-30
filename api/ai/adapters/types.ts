/** Provider-agnostic types for the AI adapter layer */

export type AiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; base64: string };

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiToolResult {
  toolCallId: string;
  content: AiContentPart[];
}

export interface AiAdapterMessage {
  role: 'user' | 'assistant' | 'tool_result';
  content: AiContentPart[] | string;
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
}

export interface AiAdapterRequest {
  model: string;
  apiKey: string;
  systemPrompt: string;
  messages: AiAdapterMessage[];
  tools?: AiToolDefinition[];
  maxTokens?: number;
}

export interface AiAdapterResponse {
  content: string;
  toolCalls?: AiToolCall[];
}

export interface AiProviderAdapter {
  call(request: AiAdapterRequest): Promise<AiAdapterResponse>;
}
