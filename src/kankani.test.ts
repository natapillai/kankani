import { describe, it, expect, afterEach } from 'vitest';
import { kankani, type Kankani, type KankaniOptions } from './kankani.js';

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
    const span = (id: string, traceId: string) => ({
      id,
      traceId,
      name: 'op',
      startTime: Date.now(),
      attributes: {},
      status: 'ok' as const,
    });
    k.store.addSpan(span('a', 't1'));
    k.store.addSpan(span('b', 't2'));
    k.store.addSpan(span('c', 't3'));
    expect(k.store.getTrace('t1')).toBeUndefined();
    expect(k.store.getTrace('t3')).toBeDefined();
  });

  it('stop() shuts down the server', async () => {
    const k = await kankani({ port: 0 });
    await k.stop();
    await expect(fetch(k.url)).rejects.toThrow();
  });
});
