import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { SpanStore } from './spanStore.js';
import { expressMiddleware } from './middleware.js';

describe('expressMiddleware', () => {
  const store = new SpanStore();
  let server: Server;
  let url: string;

  beforeAll(async () => {
    const app = express();
    app.use(expressMiddleware(store));
    app.get('/ok', (_req, res) => {
      res.send('hi');
    });
    app.get('/boom', (_req, res) => {
      res.status(500).send('no');
    });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address() as AddressInfo;
    url = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  );

  it('records a span on response close with method, url, and status', async () => {
    store.clear();
    await fetch(`${url}/ok`);
    const span = store.listTraces()[0]!.spans[0]!;
    expect(span.name).toBe('GET /ok');
    expect(span.attributes['http.method']).toBe('GET');
    expect(span.attributes['http.url']).toBe('/ok');
    expect(span.attributes['http.status']).toBe(200);
    expect(span.status).toBe('ok');
    expect(span.endTime).toBeDefined();
  });

  it('marks 5xx responses as error', async () => {
    store.clear();
    await fetch(`${url}/boom`);
    const span = store.listTraces()[0]!.spans[0]!;
    expect(span.attributes['http.status']).toBe(500);
    expect(span.status).toBe('error');
  });
});
