import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { SpanStore } from './spanStore.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

const PLACEHOLDER_HTML = `<!doctype html>
<html><head><title>kankani dashboard</title></head>
<body><h1>kankani dashboard</h1>
<p>UI arrives later in Milestone 2. JSON API is live at <code>/api/traces</code> and <code>/api/traces/:id</code>.</p></body></html>
`;

/** Parameters for creating the dashboard server. */
export interface DashboardServerConfig {
  store: SpanStore;
  /** When set, all `/api/*` requests must include `Authorization: Bearer <token>`. */
  token?: string;
}

/**
 * Internal HTTP server backing the dashboard. Serves a small JSON API over
 * the shared `SpanStore` and (eventually) the built dashboard UI.
 */
export function createDashboardServer(config: DashboardServerConfig): Server {
  return createServer((req, res) => {
    handle(req, res, config);
  });
}

function handle(req: IncomingMessage, res: ServerResponse, config: DashboardServerConfig): void {
  const url = req.url ?? '';
  const method = req.method ?? 'GET';

  if (method === 'GET' && (url === '/' || url === '/index.html')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PLACEHOLDER_HTML);
    return;
  }

  if (!url.startsWith('/api/')) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }

  if (!isAuthorized(req, config.token)) {
    sendJson(res, 401, { error: 'unauthorized' });
    return;
  }

  if (method !== 'GET') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  const parsed = new URL(url, 'http://kankani.local');
  if (parsed.pathname === '/api/traces') {
    const limit = parseLimit(parsed.searchParams.get('limit'));
    sendJson(res, 200, config.store.listTraces().slice(0, limit));
    return;
  }
  if (parsed.pathname.startsWith('/api/traces/')) {
    const id = parsed.pathname.slice('/api/traces/'.length);
    const trace = id ? config.store.getTrace(id) : undefined;
    if (!trace) {
      sendJson(res, 404, { error: 'not found' });
      return;
    }
    sendJson(res, 200, trace);
    return;
  }

  sendJson(res, 404, { error: 'not found' });
}

function parseLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function isAuthorized(req: IncomingMessage, token: string | undefined): boolean {
  if (token === undefined) return true;
  const header = req.headers.authorization;
  if (header === undefined) return false;
  const expected = `Bearer ${token}`;
  // length-mismatch short-circuit is safe because length is not secret;
  // the actual byte comparison still uses timingSafeEqual on equal-length input
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
