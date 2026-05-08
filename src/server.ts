import Anthropic from '@anthropic-ai/sdk';
import { timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeTrace, type AnalysisClient } from './analyze.js';
import type { SpanStore } from './spanStore.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;
const DEFAULT_MODEL = 'claude-opus-4-7';

const PLACEHOLDER_HTML = `<!doctype html>
<html><head><title>kankani dashboard</title></head>
<body><h1>kankani dashboard</h1>
<p>Built UI not found. Run <code>pnpm build</code> at the kankani repo root, or use the Vite dev server with <code>pnpm dashboard:dev</code>.</p>
<p>JSON API is live at <code>/api/traces</code> and <code>/api/traces/:id</code>.</p></body></html>
`;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function findUIRoot(): string | null {
  const candidates = [
    fileURLToPath(new URL('./ui/', import.meta.url)),
    fileURLToPath(new URL('../dist/ui/', import.meta.url)),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'index.html'))) return candidate;
  }
  return null;
}

const UI_ROOT = findUIRoot();

/** Parameters for creating the dashboard server. */
export interface DashboardServerConfig {
  store: SpanStore;
  /** When set, all `/api/*` requests must include `Authorization: Bearer <token>`. */
  token?: string;
  /** Anthropic client for the analyze endpoint. When absent, AI features are disabled. */
  anthropic?: AnalysisClient | null;
  /** Claude model id used by the analyze endpoint. */
  model?: string;
}

/**
 * Internal HTTP server backing the dashboard. Serves the built React UI
 * (when present in dist/ui/) and a JSON API over the shared `SpanStore`.
 */
export function createDashboardServer(config: DashboardServerConfig): Server {
  return createServer((req, res) => {
    handle(req, res, config);
  });
}

function handle(req: IncomingMessage, res: ServerResponse, config: DashboardServerConfig): void {
  const url = req.url ?? '';
  const method = req.method ?? 'GET';

  if (url.startsWith('/api/')) {
    void handleApi(req, res, config, url, method);
    return;
  }

  if (method !== 'GET') {
    res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('method not allowed');
    return;
  }

  if (tryServeStatic(url, res)) return;

  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PLACEHOLDER_HTML);
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
}

async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  config: DashboardServerConfig,
  url: string,
  method: string,
): Promise<void> {
  if (!isAuthorized(req, config.token)) {
    sendJson(res, 401, { error: 'unauthorized' });
    return;
  }

  const parsed = new URL(url, 'http://kankani.local');
  const pathname = parsed.pathname;

  if (pathname === '/api/config' && method === 'GET') {
    const aiConfigured = config.anthropic != null;
    sendJson(res, 200, {
      aiConfigured,
      model: aiConfigured ? (config.model ?? DEFAULT_MODEL) : null,
    });
    return;
  }

  if (pathname === '/api/traces' && method === 'GET') {
    const limit = parseLimit(parsed.searchParams.get('limit'));
    sendJson(res, 200, config.store.listTraces().slice(0, limit));
    return;
  }

  if (pathname.startsWith('/api/traces/') && pathname.endsWith('/analyze')) {
    if (method !== 'POST') {
      sendJson(res, 405, { error: 'method not allowed' });
      return;
    }
    const id = pathname.slice('/api/traces/'.length, -'/analyze'.length);
    await handleAnalyze(id, res, config);
    return;
  }

  if (pathname.startsWith('/api/traces/') && method === 'GET') {
    const id = pathname.slice('/api/traces/'.length);
    const trace = id ? config.store.getTrace(id) : undefined;
    if (!trace) {
      sendJson(res, 404, { error: 'not found' });
      return;
    }
    sendJson(res, 200, trace);
    return;
  }

  const knownPath =
    pathname === '/api/config' ||
    pathname === '/api/traces' ||
    pathname.startsWith('/api/traces/');
  if (knownPath) {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  sendJson(res, 404, { error: 'not found' });
}

async function handleAnalyze(
  id: string,
  res: ServerResponse,
  config: DashboardServerConfig,
): Promise<void> {
  if (!id || id.includes('/')) {
    sendJson(res, 404, { error: 'not found' });
    return;
  }
  if (config.anthropic == null) {
    sendJson(res, 503, {
      error:
        'AI not configured. Set ANTHROPIC_API_KEY or pass anthropicApiKey in KankaniOptions.',
    });
    return;
  }
  const trace = config.store.getTrace(id);
  if (!trace) {
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  try {
    const analysis = await analyzeTrace(
      trace,
      config.anthropic,
      config.model ?? DEFAULT_MODEL,
    );
    sendJson(res, 200, { analysis });
  } catch (err) {
    const mapped = mapAnthropicError(err);
    sendJson(res, mapped.status, { error: mapped.message });
  }
}

function mapAnthropicError(err: unknown): { status: number; message: string } {
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 503, message: 'AI authentication failed' };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, message: 'AI rate limit exceeded' };
  }
  if (err instanceof Anthropic.APIError) {
    return { status: 502, message: `AI service error (${err.status?.toString() ?? 'unknown'})` };
  }
  return { status: 504, message: 'AI service unreachable' };
}

function tryServeStatic(url: string, res: ServerResponse): boolean {
  if (UI_ROOT === null) return false;

  const requested = url === '/' ? 'index.html' : url.replace(/^\//, '');
  const cleanPath = requested.split('?')[0]?.split('#')[0] ?? '';
  if (!cleanPath) return false;

  const normalized = normalize(cleanPath);
  if (normalized.startsWith('..') || normalized.includes('\0')) return false;

  const filePath = join(UI_ROOT, normalized);
  if (!filePath.startsWith(UI_ROOT)) return false;
  if (!existsSync(filePath)) return false;

  try {
    const content = readFileSync(filePath);
    const mime = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': mime });
    res.end(content);
    return true;
  } catch {
    return false;
  }
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
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
