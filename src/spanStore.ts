import type { Span, Trace } from './types.js';

/** Configuration for `SpanStore`. */
export interface SpanStoreOptions {
  /** Max number of traces to retain. Older traces are evicted. Default: 1000. */
  maxTraces?: number;
}

const DEFAULT_MAX_TRACES = 1000;

/**
 * In-memory span storage. Groups spans into traces by `traceId` and caps total
 * memory by evicting the oldest trace when over capacity.
 */
export class SpanStore {
  private readonly maxTraces: number;
  private readonly traces = new Map<string, Trace>();

  constructor(options: SpanStoreOptions = {}) {
    this.maxTraces = options.maxTraces ?? DEFAULT_MAX_TRACES;
  }

  /**
   * Append a span to its trace. Creates a new trace on the first span seen for
   * a `traceId`; evicts the oldest trace if the store is at capacity.
   */
  addSpan(span: Span): void {
    let trace = this.traces.get(span.traceId);
    if (!trace) {
      trace = {
        id: span.traceId,
        rootSpanId: span.id,
        spans: [],
        startTime: span.startTime,
      };
      this.evictIfNeeded();
      this.traces.set(span.traceId, trace);
    }
    trace.spans.push(span);
    this.recomputeWindow(trace);
  }

  /** Returns the trace with the given id, or `undefined` if not found. */
  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  /** Returns all retained traces, most-recently-started first. */
  listTraces(): Trace[] {
    return Array.from(this.traces.values()).reverse();
  }

  /** Drops every retained trace. */
  clear(): void {
    this.traces.clear();
  }

  private evictIfNeeded(): void {
    if (this.traces.size < this.maxTraces) return;
    const oldest = this.traces.keys().next().value;
    if (oldest !== undefined) this.traces.delete(oldest);
  }

  private recomputeWindow(trace: Trace): void {
    let earliest = Number.POSITIVE_INFINITY;
    let latest = Number.NEGATIVE_INFINITY;
    let allEnded = true;
    for (const s of trace.spans) {
      if (s.startTime < earliest) earliest = s.startTime;
      if (s.endTime === undefined) {
        allEnded = false;
      } else if (s.endTime > latest) {
        latest = s.endTime;
      }
    }
    trace.startTime = earliest;
    if (allEnded) {
      trace.endTime = latest;
    } else {
      delete trace.endTime;
    }
  }
}
