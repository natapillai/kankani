import type { Trace } from 'kankani';

export type { Span, Trace } from 'kankani';

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

/** Aggregate trace status: any error span makes it error; any unset makes it unset; else ok. */
export function aggregateStatus(trace: Trace): 'ok' | 'error' | 'unset' {
  let sawUnset = false;
  for (const span of trace.spans) {
    if (span.status === 'error') return 'error';
    if (span.status === 'unset') sawUnset = true;
  }
  return sawUnset ? 'unset' : 'ok';
}
