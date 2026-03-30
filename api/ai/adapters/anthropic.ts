import Anthropic from '@anthropic-ai/sdk';
import type {
  AiProviderAdapter,
  AiAdapterRequest,
  AiAdapterResponse,
  AiAdapterMessage,
  AiContentPart,
  AiToolDefinition,
} from './types';

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
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.arguments,
        });
      }
      result.push({ role: 'assistant', content });
    } else {
      const content =
        typeof msg.content === 'string'
          ? msg.content
          : toAnthropicContent(msg.content);
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

export const anthropicAdapter: AiProviderAdapter = {
  async call(request: AiAdapterRequest): Promise<AiAdapterResponse> {
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
    const toolCalls: AiAdapterResponse['toolCalls'] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content: textParts.join(''),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  },
};
