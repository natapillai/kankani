import type { Trace } from 'kankani';

export type { Trace } from 'kankani';

/**
 * Fetch the most recent traces from the kankani dashboard server.
 * Same-origin in production; in dev the Vite proxy forwards to :9100.
 */
export async function fetchTraces(limit = 100): Promise<Trace[]> {
  const res = await fetch(`/api/traces?limit=${limit.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to load traces: ${res.status.toString()} ${res.statusText}`);
  }
  return res.json() as Promise<Trace[]>;
}
