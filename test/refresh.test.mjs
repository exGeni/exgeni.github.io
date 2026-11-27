import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, searchAll } from '../scripts/update-data.mjs';
import { checkCards } from '../scripts/check-claims.mjs';

const response = (body, status = 200, headers = {}) => ({ ok: status < 300, status, json: async () => body, headers: { get: name => headers[name] ?? null } });
const items = n => Array.from({ length: n }, (_, i) => ({ id: i + 1, state: 'closed', state_reason: 'completed', created_at: '2026-11-01T00:00:00Z' }));
const paged = all => async url => {
  const page = Number(new URL(url).searchParams.get('page'));
  return response({ total_count: all.length, incomplete_results: false, items: all.slice((page - 1) * 100, page * 100) });
};
const context = fetch => ({ fetch, env: {}, sleep: async () => {} });

for (const size of [101, 201]) {
  test(`search reads every page of ${size} items, oldest first`, async () => {
    const urls = [];
    const fetch = paged(items(size));
    const found = await searchAll('a/b', 'issue', context(async url => { urls.push(url); return fetch(url); }));
    assert.equal(found.length, size);
    assert.match(urls[0], /sort=created&order=asc/);
  });
}

test('repeated items, incomplete results and over 1000 results fail the run', async () => {
  const repeated = async () => response({ total_count: 2, items: [{ id: 1 }, { id: 1 }] });
  await assert.rejects(searchAll('a/b', 'pr', context(repeated)), /STATS_INCOMPLETE.*1 unique items of 2/s);
  await assert.rejects(searchAll('a/b', 'pr', context(async () => response({ total_count: 1, incomplete_results: true, items: [] }))), /STATS_INCOMPLETE/);
  await assert.rejects(searchAll('a/b', 'pr', context(async () => response({ total_count: 1001, items: [] }))), /at most 1000/);
});

test('a rate limit is retried twice, then reported with a code and without the token', async () => {
  let calls = 0;
  const limited = async () => { calls++; return response({ message: 'slow down' }, 429, { 'retry-after': '1' }); };
  await assert.rejects(
    searchAll('a/b', 'issue', { fetch: limited, env: { GITHUB_TOKEN: 'secret-value' }, sleep: async () => {} }),
    error => error.code === 'STATS_RATE_LIMIT' && /GITHUB_TOKEN was set/.test(error.message) && !error.message.includes('secret-value') && /snapshot not written/.test(error.message)
  );
  assert.equal(calls, 3);
});

test('a network failure gets a code', async () => {
  await assert.rejects(searchAll('a/b', 'issue', context(async () => { throw new Error('offline'); })), /STATS_HTTP: network failure/);
});

async function workspace(ledger) {
  const dir = await mkdtemp(join(tmpdir(), 'stats-'));
  const paths = { ledger: join(dir, 'adoptions.json'), out: join(dir, 'out.json') };
  await writeFile(paths.ledger, JSON.stringify(ledger));
  return paths;
}

test('a bad ledger stops before any request and writes nothing', async () => {
  const paths = await workspace([{ url: 'https://github.com/a/b/pull/1', status: 'done' }]);
  const fetch = async () => assert.fail('no request expected');
  await assert.rejects(run({ fetch, now: () => new Date(), env: {}, paths, log: () => {} }), /STATS_LEDGER/);
  await assert.rejects(access(paths.out));
});

test('a run writes the snapshot and warns only about changes and gaps', async () => {
  const url = n => `https://github.com/garrytan/gbrain/pull/${n}`;
  const paths = await workspace([
    { url: url(1), status: 'awaiting', pr_state: 'closed', checked_on: '2026-11-27' },
    { url: url(2), status: 'awaiting', pr_state: 'open', checked_on: '2026-11-27' }
  ]);
  const pulls = [1, 2, 3].map(n => ({ id: n, html_url: url(n), state: 'closed', created_at: '2026-10-01T00:00:00Z', pull_request: {} }));
  const fetch = async address => {
    const q = new URL(address).searchParams.get('q');
    const list = q.includes('garrytan/gbrain') && q.endsWith('is:pr') ? pulls : [];
    return response({ total_count: list.length, items: list });
  };
  const { snapshot, warnings } = await run({ fetch, now: () => new Date('2026-11-27T00:00:00Z'), env: {}, paths, log: () => {} });
  assert.equal(snapshot.scope.length, 5);
  assert.equal(snapshot.adoption.not_reviewed, 1);
  assert.deepEqual(snapshot.monthly.map(r => r.month), ['2026-10', '2026-11']);
  assert.equal(warnings.length, 2);
  assert.match(warnings.join('\n'), /STATS_UNREVIEWED.*pull\/3/);
  assert.match(warnings.join('\n'), /STATS_CHANGED.*pull\/2 was open/);
  assert.equal(JSON.parse(await readFile(paths.out, 'utf8')).totals.pull_requests, 3);
});

test('claim check fails on a merged "awaiting" card and a wrong milestone, passes a landed one', async () => {
  const cards = [
    { id: 'wait', label: 'awaiting_merge', pr_url: 'https://github.com/a/b/pull/1', milestone: 'v1' },
    { id: 'done', label: 'reported_fixed', landing_url: 'https://github.com/a/b/pull/2' }
  ];
  const lines = [];
  const failed = await checkCards(cards, async url => url.endsWith('/1') ? { state: 'closed', merged_at: 'x', milestone: null } : { merged_at: 'x' }, line => lines.push(line));
  assert.equal(failed, 2);
  assert.match(lines[0], /card wait/);
  const offlineOne = async url => { if (url.endsWith('/2')) throw new Error('offline'); return { state: 'open', milestone: { title: 'v1' } }; };
  assert.equal(await checkCards(cards, offlineOne, () => {}), 0);
  assert.equal(await checkCards(cards, async () => { throw new Error('offline'); }, () => {}), 1);
});
