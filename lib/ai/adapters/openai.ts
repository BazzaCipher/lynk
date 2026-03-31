import OpenAI from 'openai';
import type {
  AiProviderAdapter,
  AiAdapterRequest,
  AiAdapterResponse,
  AiAdapterMessage,
  AiContentPart,
  AiToolDefinition,
} from './types';

function toOpenAIContent(parts: AiContentPart[]): OpenAI.ChatCompletionContentPart[] {
  return parts.map((p) => {
    if (p.type === 'text') return { type: 'text' as const, text: p.text };
    return {
      type: 'image_url' as const,
      image_url: { url: `data:${p.mimeType};base64,${p.base64}` },
    };
  });
}

function toOpenAIMessages(
  systemPrompt: string,
  messages: AiAdapterMessage[]
): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.role === 'tool_result' && msg.toolResults) {
      for (const tr of msg.toolResults) {
        // OpenAI tool results are text-only; encode images as data URIs in text
        const textContent = tr.content
          .map((p) => (p.type === 'text' ? p.text : `[image: data:${p.mimeType};base64,${p.base64.slice(0, 50)}...]`))
          .join('\n');
        result.push({
          role: 'tool',
          tool_call_id: tr.toolCallId,
          content: textContent,
        });
      }
    } else if (msg.role === 'assistant' && msg.toolCalls?.length) {
      result.push({
        role: 'assistant',
        content: typeof msg.content === 'string' ? msg.content : null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      });
    } else {
      const content =
        typeof msg.content === 'string'
          ? msg.content
          : toOpenAIContent(msg.content);
      result.push({
        role: msg.role as 'user' | 'assistant',
        content,
      } as OpenAI.ChatCompletionMessageParam);
    }
  }

  return result;
}

function toOpenAITools(tools: AiToolDefinition[]): OpenAI.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export const openaiAdapter: AiProviderAdapter = {
  async call(request: AiAdapterRequest): Promise<AiAdapterResponse> {
    const client = new OpenAI({ apiKey: request.apiKey });

    const params: OpenAI.ChatCompletionCreateParams = {
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      messages: toOpenAIMessages(request.systemPrompt, request.messages),
    };

    if (request.tools?.length) {
      params.tools = toOpenAITools(request.tools);
    }

    const response = await client.chat.completions.create(params);
    const choice = response.choices[0];
    const message = choice?.message;

    const toolCalls: AiAdapterResponse['toolCalls'] = [];
    if (message?.tool_calls) {
      for (const tc of message.tool_calls) {
        if (tc.type === 'function') {
          const fn = tc as { id: string; type: 'function'; function: { name: string; arguments: string } };
          toolCalls.push({
            id: fn.id,
            name: fn.function.name,
            arguments: JSON.parse(fn.function.arguments),
          });
        }
      }
    }

    return {
      content: message?.content ?? '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  },
};
