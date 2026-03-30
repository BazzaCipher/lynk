import { GoogleGenerativeAI, type Content, type Part, type FunctionDeclaration, SchemaType } from '@google/generative-ai';
import type {
  AiProviderAdapter,
  AiAdapterRequest,
  AiAdapterResponse,
  AiAdapterMessage,
  AiContentPart,
  AiToolDefinition,
} from './types';

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
          .map((p) => p.text)
          .join('\n');
        contents.push({
          role: 'function',
          parts: [{ functionResponse: { name: tr.toolCallId, response: { result: textContent } } }],
        });
      }
    } else if (msg.role === 'assistant') {
      const parts: Part[] = [];
      if (typeof msg.content === 'string' && msg.content) {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        parts.push(...toGeminiParts(msg.content));
      }
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
        }
      }
      contents.push({ role: 'model', parts });
    } else {
      // user
      const parts =
        typeof msg.content === 'string'
          ? [{ text: msg.content }]
          : toGeminiParts(msg.content);
      contents.push({ role: 'user', parts });
    }
  }

  return contents;
}

function jsonSchemaToGemini(schema: Record<string, unknown>): Record<string, unknown> {
  // Convert JSON Schema to Gemini's schema format (basic mapping)
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

function toGeminiTools(tools: AiToolDefinition[]): FunctionDeclaration[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: jsonSchemaToGemini(t.parameters) as unknown as FunctionDeclaration['parameters'],
  }));
}

export const geminiAdapter: AiProviderAdapter = {
  async call(request: AiAdapterRequest): Promise<AiAdapterResponse> {
    const genAI = new GoogleGenerativeAI(request.apiKey);

    const modelConfig: Record<string, unknown> = {};
    const geminiTools = request.tools?.length ? toGeminiTools(request.tools) : undefined;

    const model = genAI.getGenerativeModel({
      model: request.model,
      systemInstruction: request.systemPrompt,
      ...(geminiTools ? { tools: [{ functionDeclarations: geminiTools }] } : {}),
      ...modelConfig,
    });

    const contents = toGeminiContents(request.messages);
    const result = await model.generateContent({ contents });
    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate?.content?.parts) {
      return { content: response.text?.() ?? '' };
    }

    const textParts: string[] = [];
    const toolCalls: AiAdapterResponse['toolCalls'] = [];

    for (const part of candidate.content.parts) {
      if ('text' in part && part.text) {
        textParts.push(part.text);
      } else if ('functionCall' in part && part.functionCall) {
        toolCalls.push({
          id: part.functionCall.name, // Gemini uses name as ID
          name: part.functionCall.name,
          arguments: (part.functionCall.args ?? {}) as Record<string, unknown>,
        });
      }
    }

    return {
      content: textParts.join(''),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  },
};
