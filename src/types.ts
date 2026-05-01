/**
 * A single operation in a trace — one HTTP request, one DB query, one async call.
 */
export interface Span {
  /** Unique identifier for this span. */
  id: string;
  /** Trace this span belongs to. Spans are grouped by `traceId`. */
  traceId: string;
  /** Parent span ID. Absent for root spans. */
  parentId?: string;
  /** Human-readable label, e.g. `GET /users/:id`. */
  name: string;
  /** Start timestamp, ms since epoch. */
  startTime: number;
  /** End timestamp, ms since epoch. Absent while the span is in flight. */
  endTime?: number;
  /** Metadata attached to the span. */
  attributes: Record<string, AttributeValue>;
  /** Outcome of the operation. */
  status: SpanStatus;
  /** Error details when `status === 'error'`. */
  error?: SpanError;
}

/** Permitted attribute value types — kept primitive for simple JSON serialization. */
export type AttributeValue = string | number | boolean;

/** `unset` while in flight; `ok` / `error` are terminal. */
export type SpanStatus = 'ok' | 'error' | 'unset';

/** Captured error data for a failed span. */
export interface SpanError {
  /** Typically `error.message`. */
  message: string;
  /** Stack trace if available. */
  stack?: string;
}

/**
 * A single end-to-end trace — one request and all its child operations.
 */
export interface Trace {
  /** Shared across all spans in this trace. */
  id: string;
  /** ID of the span with no `parentId`. There must be exactly one. */
  rootSpanId: string;
  /** All spans in this trace, in insertion order. */
  spans: Span[];
  /** Earliest `startTime` across all spans. */
  startTime: number;
  /** Latest `endTime` across all spans. Absent while any span is in flight. */
  endTime?: number;
}
