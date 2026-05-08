import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { analyzeTrace, type AnalysisClient } from './analyze.js';
import type { Trace } from './types.js';

function makeAnalysisClient(): {
  client: AnalysisClient;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn();
  return { client: { messages: { create } } as unknown as AnalysisClient, create };
}

const trace: Trace = {
  id: 't1',
  rootSpanId: 's1',
  spans: [
    {
      id: 's1',
      traceId: 't1',
      name: 'GET /api/users',
      startTime: 0,
      endTime: 50,
      attributes: { 'http.method': 'GET', 'http.status': 200 },
      status: 'ok',
    },
  ],
  startTime: 0,
  endTime: 50,
};

describe('analyzeTrace', () => {
  it('returns the text from the response', async () => {
    const { client, create } = makeAnalysisClient();
    create.mockResolvedValue({
      content: [{ type: 'text', text: 'a brief analysis' }],
    } as unknown as Anthropic.Message);

    const result = await analyzeTrace(trace, client, 'claude-opus-4-7');
    expect(result).toBe('a brief analysis');
  });

  it('passes the right shape to messages.create', async () => {
    const { client, create } = makeAnalysisClient();
    create.mockResolvedValue({
      content: [{ type: 'text', text: '' }],
    } as unknown as Anthropic.Message);

    await analyzeTrace(trace, client, 'claude-haiku-4-5');

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5',
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: expect.arrayContaining([
          expect.objectContaining({ cache_control: { type: 'ephemeral' } }),
        ]),
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('GET /api/users'),
          }),
        ]),
      }),
    );
  });

  it('returns empty string when no text block is present', async () => {
    const { client, create } = makeAnalysisClient();
    create.mockResolvedValue({
      content: [{ type: 'thinking', thinking: 'hmm' }],
    } as unknown as Anthropic.Message);

    const result = await analyzeTrace(trace, client, 'claude-opus-4-7');
    expect(result).toBe('');
  });

  it('propagates errors from the SDK', async () => {
    const { client, create } = makeAnalysisClient();
    create.mockRejectedValue(new Error('network down'));
    await expect(analyzeTrace(trace, client, 'claude-opus-4-7')).rejects.toThrow('network down');
  });
});
