// Local preview. `node tools/serve.mjs [state]` serves the site with invented data in place of the snapshot.
// States: unavailable, old, stale, unreviewed, months12, months24. No state: the real snapshot.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize } from 'node:path';

const root = new URL('../', import.meta.url);
const state = process.argv[2];
const port = Number(process.env.PORT || 8000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

function fixture(real) {
  const data = structuredClone(real);
  const months = n => Array.from({ length: n }, (_, i) => ({ month: `${2025 + Math.floor((i + 5) / 12)}-${String(((i + 5) % 12) + 1).padStart(2, '0')}`, issues: i % 5, pull_requests: i % 2, total: (i % 5) + (i % 2) }));
  if (state === 'old') return { generated_at: data.generated_at, totals: data.totals, monthly: [{ month: 'Nov*', total: 1, issues: 1, pull_requests: 0 }] };
  if (state === 'stale') data.generated_at = '2020-01-01T00:00:00Z';
  if (state === 'unreviewed') data.adoption.not_reviewed = 2;
  if (state === 'months12') data.monthly = months(12);
  if (state === 'months24') data.monthly = months(24);
  return data;
}

createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname)).replace(/\\/g, '/').replace(/^\/+/, '') || 'index.html';
  try {
    if (path.includes('..')) throw new Error('outside root');
    let body = await readFile(new URL(path, root));
    if (state && path === 'data/contributions.json') {
      if (state === 'unavailable') throw new Error('unavailable fixture');
      body = JSON.stringify(fixture(JSON.parse(body)));
    }
    response.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/ ${state || 'real data'}`));
