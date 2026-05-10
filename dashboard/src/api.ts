import type { Trace } from 'kankani';

export type { Span, Trace } from 'kankani';

/** Runtime config exposed by the dashboard server. */
export interface ServerConfig {
  aiConfigured: boolean;
  model: string | null;
}

/** Error class for /api/* failures that carry a structured `code` field. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Fetch the most recent traces (newest first). Same-origin in prod, proxied in dev. */
export async function fetchTraces(limit = 100): Promise<Trace[]> {
  const res = await fetch(`/api/traces?limit=${limit.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to load traces: ${res.status.toString()} ${res.statusText}`);
  }
  return res.json() as Promise<Trace[]>;
}

/** Fetch a single trace by id. */
export async function fetchTrace(id: string): Promise<Trace> {
  const res = await fetch(`/api/traces/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`Failed to load trace: ${res.status.toString()} ${res.statusText}`);
  }
  return res.json() as Promise<Trace>;
}

/** Fetch the server's runtime config (which AI features are enabled). */
export async function fetchConfig(): Promise<ServerConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) {
    throw new Error(`Failed to load config: ${res.status.toString()} ${res.statusText}`);
  }
  return res.json() as Promise<ServerConfig>;
}

/**
 * Trigger an AI analysis of a trace. Returns the markdown response on success;
 * throws an {@link ApiError} carrying the server's `code` on failure.
 */
export async function analyzeTrace(id: string): Promise<string> {
  const res = await fetch(`/api/traces/${encodeURIComponent(id)}/analyze`, {
    method: 'POST',
  });
  const body = (await res.json()) as { analysis?: string; error?: string; code?: string };
  if (!res.ok) {
    throw new ApiError(body.error ?? `Request failed (${res.status.toString()})`, body.code ?? 'unknown', res.status);
  }
  return body.analysis ?? '';
}

/** Aggregate trace status: any error span makes it error; any unset makes it unset; else ok. */
export function aggregateStatus(trace: Trace): 'ok' | 'error' | 'unset' {
  let sawUnset = false;
  for (const span of trace.spans) {
    if (span.status === 'error') return 'error';
    if (span.status === 'unset') sawUnset = true;
  }
  return sawUnset ? 'unset' : 'ok';
}
