import { randomUUID } from 'node:crypto';
import type { SpanStore } from './spanStore.js';
import type { AttributeValue, Span, SpanError } from './types.js';

/** Options for `trace()`. */
export interface TraceOptions {
  /** Attributes to record on the span. */
  attributes?: Record<string, AttributeValue>;
  /**
   * Existing span to nest under. The new span inherits the parent's `traceId`
   * and gets the parent's `id` as its `parentId`.
   */
  parentSpan?: Span;
}

/**
 * Wrap an async operation in a span. The span is recorded into `store`
 * regardless of whether `fn` resolves or rejects; thrown errors propagate
 * after the span has been captured.
 */
export async function trace<T>(
  store: SpanStore,
  name: string,
  fn: () => Promise<T>,
  options?: TraceOptions,
): Promise<T> {
  const span: Span = {
    id: randomUUID(),
    traceId: options?.parentSpan?.traceId ?? randomUUID(),
    name,
    startTime: Date.now(),
    attributes: { ...(options?.attributes ?? {}) },
    status: 'unset',
  };
  if (options?.parentSpan) {
    span.parentId = options.parentSpan.id;
  }
  try {
    const result = await fn();
    span.status = 'ok';
    return result;
  } catch (err) {
    span.status = 'error';
    span.error = toSpanError(err);
    throw err;
  } finally {
    span.endTime = Date.now();
    store.addSpan(span);
  }
}

function toSpanError(err: unknown): SpanError {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}
