import type { RequestHandler } from 'express';
import { expressMiddleware } from './middleware.js';
import { createDashboardServer } from './server.js';
import { SpanStore } from './spanStore.js';

/** Configuration for `kankani()`. */
export interface KankaniOptions {
  /** Dashboard server port. Default 9100. Use 0 for an OS-assigned port. */
  port?: number;
  /** Bind interface. Default '127.0.0.1'. */
  host?: string;
  /** Required when binding to a non-local host. */
  token?: string;
  /** Max traces retained by the SpanStore. Default 1000. */
  maxTraces?: number;
}

/** Handle for a running kankani instance. */
export interface Kankani {
  /** Express middleware. Attach with `app.use(k.middleware)`. */
  middleware: RequestHandler;
  /** Span store shared with the dashboard server. */
  store: SpanStore;
  /** Dashboard URL, e.g. `http://127.0.0.1:9100`. */
  url: string;
  /** Shut down the dashboard server. */
  stop(): Promise<void>;
}

const DEFAULT_PORT = 9100;
const DEFAULT_HOST = '127.0.0.1';
const LOCAL_HOSTS: ReadonlySet<string> = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * Start a kankani instance: a `SpanStore`, the Express middleware that records
 * spans into it, and a local dashboard server.
 *
 * Bound to localhost by default. Refuses non-local hosts unless a `token`
 * is supplied — see DESIGN.md for the security rationale.
 */
export async function kankani(options: KankaniOptions = {}): Promise<Kankani> {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;

  if (!LOCAL_HOSTS.has(host) && options.token === undefined) {
    throw new Error(
      `kankani: refusing to bind to '${host}' without a token. Pass 'token' to authorize remote dashboard access.`,
    );
  }

  const store = new SpanStore({ maxTraces: options.maxTraces });
  const middleware = expressMiddleware(store);
  const server = createDashboardServer();

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      resolve();
    });
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address !== null ? address.port : port;
  const hostInUrl = host.includes(':') ? `[${host}]` : host;
  const url = `http://${hostInUrl}:${actualPort.toString()}`;

  return {
    middleware,
    store,
    url,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}
