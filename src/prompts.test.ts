import { describe, it, expect } from 'vitest';
import { buildAnalyzePrompt } from './prompts.js';
import type { Span, Trace } from './types.js';

function makeTrace(spans: Span[]): Trace {
  const startTime = Math.min(...spans.map((s) => s.startTime));
  const endTimes = spans.map((s) => s.endTime).filter((t): t is number => t !== undefined);
  const trace: Trace = {
    id: 't1',
    rootSpanId: spans[0]?.id ?? '',
    spans,
    startTime,
  };
  if (endTimes.length === spans.length) {
    trace.endTime = Math.max(...endTimes);
  }
  return trace;
}

describe('buildAnalyzePrompt', () => {
  it('marks the system prompt as cacheable', () => {
    const trace = makeTrace([
      {
        id: 's1',
        traceId: 't1',
        name: 'GET /',
        startTime: 100,
        endTime: 110,
        attributes: {},
        status: 'ok',
      },
    ]);
    const result = buildAnalyzePrompt(trace);
    expect(result.system).toHaveLength(1);
    expect(result.system[0]!.cache_control).toEqual({ type: 'ephemeral' });
    expect(result.system[0]!.text).toContain('kankani');
  });

  it('includes a user message with normalized trace JSON', () => {
    const trace = makeTrace([
      {
        id: 's1',
        traceId: 't1',
        name: 'GET /api/users',
        startTime: 100,
        endTime: 350,
        attributes: { 'http.status': 200 },
        status: 'ok',
      },
    ]);
    const result = buildAnalyzePrompt(trace);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.role).toBe('user');
    const content = result.messages[0]!.content;
    expect(content).toContain('GET /api/users');
    expect(content).toContain('"duration_ms": 250');
  });

  it('replaces span UUIDs with short labels and remaps parent references', () => {
    const trace = makeTrace([
      {
        id: 'long-uuid-1',
        traceId: 't1',
        name: 'parent-op',
        startTime: 100,
        endTime: 200,
        attributes: {},
        status: 'ok',
      },
      {
        id: 'long-uuid-2',
        traceId: 't1',
        parentId: 'long-uuid-1',
        name: 'child-op',
        startTime: 110,
        endTime: 150,
        attributes: {},
        status: 'ok',
      },
    ]);
    const content = buildAnalyzePrompt(trace).messages[0]!.content;
    expect(content).toContain('"label": "S1"');
    expect(content).toContain('"label": "S2"');
    expect(content).toContain('"parent": "S1"');
    expect(content).not.toContain('long-uuid-1');
    expect(content).not.toContain('long-uuid-2');
  });

  it('emits null duration when the trace is still in flight', () => {
    const trace: Trace = {
      id: 't',
      rootSpanId: 's1',
      spans: [
        { id: 's1', traceId: 't', name: 'op', startTime: 100, attributes: {}, status: 'unset' },
      ],
      startTime: 100,
    };
    const content = buildAnalyzePrompt(trace).messages[0]!.content;
    expect(content).toContain('"duration_ms": null');
  });

  it('uses relative start offsets, not raw timestamps', () => {
    const trace = makeTrace([
      {
        id: 's1',
        traceId: 't1',
        name: 'op',
        startTime: 1_700_000_000_000,
        endTime: 1_700_000_000_050,
        attributes: {},
        status: 'ok',
      },
    ]);
    const content = buildAnalyzePrompt(trace).messages[0]!.content;
    expect(content).toContain('"start_offset_ms": 0');
    expect(content).not.toContain('1700000000000');
  });
});
