import { describe, it, expect } from 'vitest';
import { SpanStore } from './spanStore.js';
import type { Span } from './types.js';

function makeSpan(traceId: string, overrides: Partial<Span> = {}): Span {
  return {
    id: 's-' + Math.random().toString(36).slice(2),
    traceId,
    name: 'op',
    startTime: Date.now(),
    attributes: {},
    status: 'unset',
    ...overrides,
  };
}

describe('SpanStore', () => {
  it('creates a trace on first span', () => {
    const store = new SpanStore();
    store.addSpan(makeSpan('t1', { id: 's1', startTime: 100 }));
    const trace = store.getTrace('t1');
    expect(trace).toBeDefined();
    expect(trace!.id).toBe('t1');
    expect(trace!.rootSpanId).toBe('s1');
    expect(trace!.startTime).toBe(100);
  });

  it('groups spans by traceId', () => {
    const store = new SpanStore();
    store.addSpan(makeSpan('t', { id: 'a' }));
    store.addSpan(makeSpan('t', { id: 'b' }));
    expect(store.getTrace('t')!.spans).toHaveLength(2);
  });

  it('lists traces newest-first', () => {
    const store = new SpanStore();
    store.addSpan(makeSpan('t1'));
    store.addSpan(makeSpan('t2'));
    store.addSpan(makeSpan('t3'));
    expect(store.listTraces().map((t) => t.id)).toEqual(['t3', 't2', 't1']);
  });

  it('evicts oldest when over maxTraces', () => {
    const store = new SpanStore({ maxTraces: 2 });
    store.addSpan(makeSpan('t1'));
    store.addSpan(makeSpan('t2'));
    store.addSpan(makeSpan('t3'));
    expect(store.getTrace('t1')).toBeUndefined();
    expect(store.getTrace('t2')).toBeDefined();
    expect(store.getTrace('t3')).toBeDefined();
  });

  it('clear() empties everything', () => {
    const store = new SpanStore();
    store.addSpan(makeSpan('t1'));
    store.clear();
    expect(store.listTraces()).toEqual([]);
  });

  it('startTime is min, endTime is max across spans', () => {
    const store = new SpanStore();
    store.addSpan(makeSpan('t', { startTime: 200, endTime: 300 }));
    store.addSpan(makeSpan('t', { startTime: 100, endTime: 250 }));
    const trace = store.getTrace('t')!;
    expect(trace.startTime).toBe(100);
    expect(trace.endTime).toBe(300);
  });

  it('endTime is undefined while any span is in flight', () => {
    const store = new SpanStore();
    store.addSpan(makeSpan('t', { startTime: 100, endTime: 200 }));
    store.addSpan(makeSpan('t', { startTime: 150 }));
    expect(store.getTrace('t')!.endTime).toBeUndefined();
  });
});
