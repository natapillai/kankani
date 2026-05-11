#!/usr/bin/env node
// scripts/verify-tarball.mjs
//
// Builds the library, packs it, installs the resulting tarball in a fresh
// temp project, and runs a small smoke test that exercises the public API
// the way a real consumer would. Catches packaging mistakes (missing files
// in `dist/`, broken `exports` mapping, type-resolution gaps) before publish.

import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
console.log(`Verifying tarball for ${pkg.name}@${pkg.version}\n`);

const work = mkdtempSync(join(tmpdir(), 'kankani-verify-'));
const tarballDir = join(work, 'tarball');
const consumerDir = join(work, 'consumer');
mkdirSync(tarballDir);
mkdirSync(consumerDir);

function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...options });
}

try {
  console.log('1/5  Build library + dashboard');
  run('pnpm build');

  console.log('\n2/5  Pack tarball');
  run(`pnpm pack --pack-destination "${tarballDir}"`);
  const tarball = readdirSync(tarballDir).find((f) => f.endsWith('.tgz'));
  if (!tarball) throw new Error('pnpm pack produced no .tgz file');
  const tarballPath = join(tarballDir, tarball);
  console.log(`   produced ${tarball}`);

  console.log('\n3/5  Set up consumer project');
  writeFileSync(
    join(consumerDir, 'package.json'),
    JSON.stringify(
      {
        name: 'kankani-verify',
        version: '0.0.0',
        private: true,
        type: 'module',
        dependencies: {
          express: '^5',
          [pkg.name]: `file:${tarballPath.replace(/\\/g, '/')}`,
        },
      },
      null,
      2,
    ),
  );

  console.log('\n4/5  Install tarball into consumer');
  run('npm install --no-audit --no-fund --loglevel=error', { cwd: consumerDir });

  console.log('\n5/5  Smoke test');
  const smoke = `
    import express from 'express';
    import { kankani } from ${JSON.stringify(pkg.name)};

    function fail(msg) { console.error('FAIL:', msg); process.exit(1); }

    const k = await kankani({ port: 0 });

    const app = express();
    app.use(k.middleware);
    app.get('/test', (_req, res) => res.send('ok'));

    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    const userPort = server.address().port;

    await fetch(\`http://127.0.0.1:\${userPort}/test\`);
    await new Promise((r) => setTimeout(r, 50));

    const traces = await (await fetch(\`\${k.url}/api/traces\`)).json();
    if (!Array.isArray(traces) || traces.length !== 1) fail('expected 1 trace, got ' + JSON.stringify(traces));
    if (traces[0].spans[0].name !== 'GET /test') fail('unexpected span name: ' + traces[0].spans[0].name);
    if (traces[0].spans[0].attributes['http.status'] !== 200) fail('unexpected http.status');

    const html = await (await fetch(\`\${k.url}/\`)).text();
    if (!html.toLowerCase().includes('kankani')) fail('dashboard HTML missing "kankani" string');
    if (!html.includes('<div id="root">')) fail('dashboard HTML missing React mount point');

    const cfg = await (await fetch(\`\${k.url}/api/config\`)).json();
    if (typeof cfg.aiConfigured !== 'boolean') fail('config.aiConfigured missing or wrong type');

    server.close();
    await k.stop();
    console.log('OK: middleware captured, dashboard served, /api/config + /api/traces respond');
  `;
  writeFileSync(join(consumerDir, 'smoke.mjs'), smoke);
  run('node smoke.mjs', { cwd: consumerDir });

  console.log('\n✓ Tarball verification passed');
} finally {
  console.log(`\nCleaning up ${work}`);
  rmSync(work, { recursive: true, force: true });
}
