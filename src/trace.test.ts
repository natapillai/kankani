import { describe, it, expect } from 'vitest';
import { SpanStore } from './spanStore.js';
import { trace } from './trace.js';
import type { Span } from './types.js';

describe('trace', () => {
  it('records a span on success and returns the resolved value', async () => {
    const store = new SpanStore();
    const result = await trace(store, 'op', async () => 42);
    expect(result).toBe(42);
    const span = store.listTraces()[0]!.spans[0]!;
    expect(span.name).toBe('op');
    expect(span.status).toBe('ok');
    expect(span.endTime).toBeDefined();
  });

  it('records a span on error and rethrows', async () => {
    const store = new SpanStore();
    await expect(
      trace(store, 'op', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const span = store.listTraces()[0]!.spans[0]!;
    expect(span.status).toBe('error');
    expect(span.error?.message).toBe('boom');
    expect(span.error?.stack).toBeDefined();
  });

  it('nests under parentSpan: shares traceId, sets parentId', async () => {
    const store = new SpanStore();
    const parent: Span = {
      id: 'parent-id',
      traceId: 'shared-trace',
      name: 'parent',
      startTime: Date.now(),
      attributes: {},
      status: 'unset',
    };
    await trace(store, 'child', async () => null, { parentSpan: parent });
    const span = store.listTraces()[0]!.spans[0]!;
    expect(span.traceId).toBe('shared-trace');
    expect(span.parentId).toBe('parent-id');
  });

  it('records attributes', async () => {
    const store = new SpanStore();
    await trace(store, 'op', async () => null, { attributes: { foo: 'bar' } });
    const span = store.listTraces()[0]!.spans[0]!;
    expect(span.attributes['foo']).toBe('bar');
  });
});
