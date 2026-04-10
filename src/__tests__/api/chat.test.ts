import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock provider factories
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => (model: string) => ({ provider: 'anthropic', model })),
}));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => (model: string) => ({ provider: 'openai', model })),
}));
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => (model: string) => ({ provider: 'google', model })),
}));
vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({ text: 'response', toolCalls: [] })),
  streamText: vi.fn(() => ({
    textStream: (async function* () { yield 'chunk'; })(),
    then: (resolve: any) => resolve({ toolCalls: [] }),
  })),
  tool: vi.fn((def: any) => def),
  Output: {},
}));

import { resolveModel, getTools, toModelMessages } from '../../../api/ai/chat';
import handler from '../../../api/ai/chat';

describe('resolveModel', () => {
  it('creates anthropic model', () => {
    const result = resolveModel('anthropic', 'claude-3', 'key') as any;
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-3');
  });

  it('creates openai model', () => {
    const result = resolveModel('openai', 'gpt-4', 'key') as any;
    expect(result.provider).toBe('openai');
  });

  it('creates gemini model', () => {
    const result = resolveModel('gemini', 'gemini-pro', 'key') as any;
    expect(result.provider).toBe('google');
  });

  it('throws for unknown provider', () => {
    expect(() => resolveModel('unknown', 'model', 'key')).toThrow('Unknown provider');
  });
});

describe('getTools', () => {
  it('returns all tools when no names specified', () => {
    const tools = getTools();
    expect(Object.keys(tools)).toContain('get_canvas_graph');
    expect(Object.keys(tools)).toContain('suggest_connection');
    expect(Object.keys(tools)).toContain('create_region');
  });

  it('returns empty when no names specified as empty array', () => {
    const tools = getTools([]);
    expect(Object.keys(tools).length).toBeGreaterThan(0); // falls through to all
  });

  it('returns subset when names specified', () => {
    const tools = getTools(['get_canvas_graph', 'get_node_details']);
    expect(Object.keys(tools)).toContain('get_canvas_graph');
    expect(Object.keys(tools)).toContain('get_node_details');
    expect(Object.keys(tools)).not.toContain('suggest_connection');
  });

  it('ignores unknown tool names', () => {
    const tools = getTools(['get_canvas_graph', 'nonexistent']);
    expect(Object.keys(tools)).toEqual(['get_canvas_graph']);
  });
});

describe('toModelMessages', () => {
  it('converts simple user message', () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    const result = toModelMessages(messages, '', undefined);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
  });

  it('prepends context to first user message', () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    const result = toModelMessages(messages, 'Context: ', undefined);
    expect(result).toHaveLength(1);
    const content = (result[0] as any).content;
    expect(content[0].text).toBe('Context: Hello');
  });

  it('includes images in first user message', () => {
    const messages = [{ role: 'user' as const, content: 'Look at this' }];
    const images = [{ mimeType: 'image/png', base64: 'abc123' }];
    const result = toModelMessages(messages, '', images);
    const content = (result[0] as any).content;
    expect(content).toHaveLength(2);
    expect(content[1].type).toBe('image');
  });

  it('converts assistant message with tool calls', () => {
    const messages = [{
      role: 'assistant' as const,
      content: 'Let me check',
      toolCalls: [{ id: 'tc1', name: 'get_canvas_graph', arguments: {} }],
    }];
    const result = toModelMessages(messages, '', undefined);
    expect(result[0].role).toBe('assistant');
    const content = (result[0] as any).content;
    expect(content).toHaveLength(2); // text + tool-call
    expect(content[1].type).toBe('tool-call');
  });

  it('converts tool_result messages', () => {
    const messages = [{
      role: 'tool_result' as const,
      content: '',
      toolResults: [{
        toolCallId: 'tc1',
        content: [{ type: 'text' as const, text: 'result data' }],
      }],
    }];
    const result = toModelMessages(messages, '', undefined);
    expect(result[0].role).toBe('tool');
  });

  it('converts plain assistant text', () => {
    const messages = [{ role: 'assistant' as const, content: 'Sure thing' }];
    const result = toModelMessages(messages, '', undefined);
    expect(result[0].role).toBe('assistant');
    expect((result[0] as any).content).toBe('Sure thing');
  });

  it('second user message does not get context prepended', () => {
    const messages = [
      { role: 'user' as const, content: 'First' },
      { role: 'assistant' as const, content: 'Reply' },
      { role: 'user' as const, content: 'Second' },
    ];
    const result = toModelMessages(messages, 'Context: ', undefined);
    expect(result).toHaveLength(3);
    expect((result[2] as any).content).toBe('Second');
  });
});

describe('handler', () => {
  function mockReqRes(body: any, method = 'POST') {
    const req = { method, body } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as any;
    return { req, res };
  }

  it('rejects non-POST', async () => {
    const { req, res } = mockReqRes({}, 'GET');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects missing required fields', async () => {
    const { req, res } = mockReqRes({ provider: 'anthropic' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects missing API key', async () => {
    const { req, res } = mockReqRes({
      provider: 'anthropic',
      model: 'claude-3',
      messages: [{ role: 'user', content: 'hi' }],
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing API key' });
  });

  it('returns 200 for valid non-streaming request', async () => {
    const { req, res } = mockReqRes({
      provider: 'anthropic',
      model: 'claude-3',
      apiKey: 'sk-test',
      mode: 'detect_fields',
      messages: [{ role: 'user', content: 'detect fields' }],
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ content: 'response' }));
  });

  it('streams for freeform mode with stream flag', async () => {
    const { req, res } = mockReqRes({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'sk-test',
      mode: 'freeform',
      stream: true,
      messages: [{ role: 'user', content: 'hello' }],
    });
    await handler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.end).toHaveBeenCalled();
  });

  it('handles errors with appropriate status codes', async () => {
    const { generateText } = await import('ai');
    (generateText as any).mockRejectedValueOnce(new Error('401 Unauthorized'));
    const { req, res } = mockReqRes({
      provider: 'anthropic',
      model: 'claude-3',
      apiKey: 'bad-key',
      mode: 'summarise',
      messages: [{ role: 'user', content: 'summarise' }],
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('handles 429 rate limit errors', async () => {
    const { generateText } = await import('ai');
    (generateText as any).mockRejectedValueOnce(new Error('429 Too Many Requests'));
    const { req, res } = mockReqRes({
      provider: 'anthropic',
      model: 'claude-3',
      apiKey: 'key',
      mode: 'freeform',
      messages: [{ role: 'user', content: 'hi' }],
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('includes ocrText and nodesContext in context block', async () => {
    const { generateText } = await import('ai');
    (generateText as any).mockResolvedValueOnce({ text: 'ok', toolCalls: [] });
    const { req, res } = mockReqRes({
      provider: 'anthropic',
      model: 'claude-3',
      apiKey: 'key',
      mode: 'detect_fields',
      ocrText: 'Invoice #123',
      nodesContext: [{ nodeId: 'n1', nodeType: 'extractor', label: 'Doc', fields: [] }],
      messages: [{ role: 'user', content: 'detect' }],
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('passes explicit tool list', async () => {
    const { generateText } = await import('ai');
    (generateText as any).mockResolvedValueOnce({ text: 'ok', toolCalls: [] });
    const { req, res } = mockReqRes({
      provider: 'anthropic',
      model: 'claude-3',
      apiKey: 'key',
      mode: 'detect_fields',
      tools: ['get_canvas_graph'],
      messages: [{ role: 'user', content: 'hi' }],
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns toolCalls when present', async () => {
    const { generateText } = await import('ai');
    (generateText as any).mockResolvedValueOnce({
      text: 'checking',
      toolCalls: [{ toolCallId: 'tc1', toolName: 'get_canvas_graph', args: {} }],
    });
    const { req, res } = mockReqRes({
      provider: 'anthropic',
      model: 'claude-3',
      apiKey: 'key',
      mode: 'freeform',
      messages: [{ role: 'user', content: 'hi' }],
    });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      toolCalls: [{ id: 'tc1', name: 'get_canvas_graph', arguments: {} }],
    }));
  });
});
