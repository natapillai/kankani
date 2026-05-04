import { describe, it, expect, afterEach } from 'vitest';
import { kankani, type Kankani, type KankaniOptions } from './kankani.js';
import type { Span, Trace } from './types.js';

function makeSpan(traceId: string, id?: string): Span {
  return {
    id: id ?? 's-' + Math.random().toString(36).slice(2),
    traceId,
    name: 'op',
    startTime: Date.now(),
    attributes: {},
    status: 'ok',
  };
}

describe('kankani', () => {
  let instances: Kankani[] = [];

  afterEach(async () => {
    await Promise.all(instances.map((k) => k.stop().catch(() => undefined)));
    instances = [];
  });

  async function start(options?: KankaniOptions): Promise<Kankani> {
    const k = await kankani({ port: 0, ...options });
    instances.push(k);
    return k;
  }

  it('starts a server reachable at .url', async () => {
    const k = await start();
    const res = await fetch(k.url);
    expect(res.status).toBe(200);
    expect((await res.text()).toLowerCase()).toContain('kankani');
  });

  it('exposes a SpanStore on .store', async () => {
    const k = await start();
    expect(k.store.listTraces()).toEqual([]);
    expect(typeof k.store.addSpan).toBe('function');
  });

  it('exposes an Express-shaped middleware on .middleware', async () => {
    const k = await start();
    expect(typeof k.middleware).toBe('function');
    expect(k.middleware.length).toBe(3);
  });

  it('refuses non-local host without a token', async () => {
    await expect(kankani({ host: '0.0.0.0', port: 0 })).rejects.toThrow(/token/i);
  });

  it('accepts non-local host when a token is provided', async () => {
    const k = await start({ host: '0.0.0.0', token: 'secret' });
    expect(k.url).toContain('0.0.0.0');
  });

  it('forwards maxTraces to the SpanStore', async () => {
    const k = await start({ maxTraces: 2 });
    k.store.addSpan(makeSpan('t1'));
    k.store.addSpan(makeSpan('t2'));
    k.store.addSpan(makeSpan('t3'));
    expect(k.store.getTrace('t1')).toBeUndefined();
    expect(k.store.getTrace('t3')).toBeDefined();
  });

  it('stop() shuts down the server', async () => {
    const k = await kankani({ port: 0 });
    await k.stop();
    await expect(fetch(k.url)).rejects.toThrow();
  });

  describe('GET /api/traces', () => {
    it('returns an empty array initially', async () => {
      const k = await start();
      const res = await fetch(`${k.url}/api/traces`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');
      expect(await res.json()).toEqual([]);
    });

    it('returns captured traces newest-first', async () => {
      const k = await start();
      k.store.addSpan(makeSpan('t1'));
      k.store.addSpan(makeSpan('t2'));
      const body = (await (await fetch(`${k.url}/api/traces`)).json()) as Trace[];
      expect(body.map((t) => t.id)).toEqual(['t2', 't1']);
    });

    it('respects ?limit=N', async () => {
      const k = await start();
      for (let i = 0; i < 5; i++) k.store.addSpan(makeSpan(`t${i.toString()}`));
      const body = (await (await fetch(`${k.url}/api/traces?limit=2`)).json()) as Trace[];
      expect(body).toHaveLength(2);
    });

    it('falls back to default when limit is invalid', async () => {
      const k = await start();
      k.store.addSpan(makeSpan('t1'));
      const res = await fetch(`${k.url}/api/traces?limit=abc`);
      expect(res.status).toBe(200);
      expect((await res.json() as Trace[])).toHaveLength(1);
    });
  });

  describe('GET /api/traces/:id', () => {
    it('returns the trace when found', async () => {
      const k = await start();
      k.store.addSpan(makeSpan('found', 'a'));
      const res = await fetch(`${k.url}/api/traces/found`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Trace;
      expect(body.id).toBe('found');
    });

    it('returns 404 when the id is unknown', async () => {
      const k = await start();
      const res = await fetch(`${k.url}/api/traces/missing`);
      expect(res.status).toBe(404);
    });
  });

  describe('token auth on /api/*', () => {
    it('returns 401 when token is set and Authorization is missing', async () => {
      const k = await start({ token: 'secret' });
      const res = await fetch(`${k.url}/api/traces`);
      expect(res.status).toBe(401);
    });

    it('returns 401 when the token does not match', async () => {
      const k = await start({ token: 'secret' });
      const res = await fetch(`${k.url}/api/traces`, {
        headers: { Authorization: 'Bearer wrong' },
      });
      expect(res.status).toBe(401);
    });

    it('returns 200 when Authorization matches the configured token', async () => {
      const k = await start({ token: 'secret' });
      const res = await fetch(`${k.url}/api/traces`, {
        headers: { Authorization: 'Bearer secret' },
      });
      expect(res.status).toBe(200);
    });

    it('does not require auth when no token is configured', async () => {
      const k = await start();
      const res = await fetch(`${k.url}/api/traces`);
      expect(res.status).toBe(200);
    });
  });

  it('end-to-end: middleware-captured spans appear in /api/traces', async () => {
    const k = await start();
    k.store.addSpan(makeSpan('e2e', 'span-a'));
    const list = (await (await fetch(`${k.url}/api/traces`)).json()) as Trace[];
    expect(list.find((t) => t.id === 'e2e')).toBeDefined();
    const single = (await (await fetch(`${k.url}/api/traces/e2e`)).json()) as Trace;
    expect(single.spans[0]?.id).toBe('span-a');
  });
});
