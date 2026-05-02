// Run with: pnpm example
// A tiny Express app that exercises the capture path. Spans are dumped to the
// console every few seconds; replaced by the real dashboard in Milestone 2.
import express from 'express';
import { SpanStore, expressMiddleware, trace } from '../src/index.js';

const store = new SpanStore();
const app = express();
app.use(expressMiddleware(store));

app.get('/', (_req, res) => {
  res.send('hello kankani');
});

app.get('/slow', async (_req, res) => {
  await new Promise((r) => setTimeout(r, 250));
  res.send('done');
});

app.get('/error', (_req, res) => {
  res.status(500).send('boom');
});

app.get('/nested', async (_req, res) => {
  await trace(store, 'inner-work', async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  res.send('ok');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT.toString()}`);
  console.log(`Try:  curl http://localhost:${PORT.toString()}/{,slow,error,nested}`);
});

setInterval(() => {
  const traces = store.listTraces();
  if (traces.length > 0) {
    console.log(`\n--- ${traces.length.toString()} trace(s) captured ---`);
    for (const t of traces.slice(0, 3)) {
      console.log(JSON.stringify(t, null, 2));
    }
  }
}, 5000);
