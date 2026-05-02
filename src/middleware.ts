import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { SpanStore } from './spanStore.js';
import type { Span } from './types.js';

/**
 * Express middleware that records a span for every HTTP request into the given
 * `SpanStore`. The span is started when the request arrives and finalized when
 * the response is closed (whether it finished normally or was aborted).
 */
export function expressMiddleware(store: SpanStore): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const span: Span = {
      id: randomUUID(),
      traceId: randomUUID(),
      name: `${req.method} ${req.path}`,
      startTime: Date.now(),
      attributes: {
        'http.method': req.method,
        'http.url': req.originalUrl ?? req.url,
      },
      status: 'unset',
    };

    res.on('close', () => {
      span.endTime = Date.now();
      span.attributes['http.status'] = res.statusCode;
      span.status = res.statusCode >= 500 ? 'error' : 'ok';
      store.addSpan(span);
    });

    next();
  };
}
