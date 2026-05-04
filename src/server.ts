import { createServer, type Server } from 'node:http';

const PLACEHOLDER_HTML = `<!doctype html>
<html><head><title>kankani dashboard</title></head>
<body><h1>kankani dashboard</h1>
<p>Coming soon. The trace API and UI land in upcoming Milestone 2 commits.</p></body></html>
`;

/**
 * Internal HTTP server backing the dashboard. Routing is intentionally
 * minimal — one placeholder page; real `/api/*` endpoints land in the
 * follow-up commit.
 */
export function createDashboardServer(): Server {
  return createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PLACEHOLDER_HTML);
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  });
}
