// Rebuilds data/contributions.json. Run: GITHUB_TOKEN=... node scripts/update-data.mjs
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { countAdoption, countIssues, monthlySeries, normalizeUrl, validateLedger } from '../lib/stats.mjs';

export const LOGIN = 'exGeni';
export const REPOSITORIES = [
  { id: 'gbrain', name: 'GBrain', repo: 'garrytan/gbrain' },
  { id: 'gstack', name: 'GStack', repo: 'garrytan/gstack' },
  { id: 'alphaclaw', name: 'AlphaClaw', repo: 'garrytan/alphaclaw' },
  { id: 'openclaw', name: 'OpenClaw', repo: 'openclaw/openclaw' },
  { id: 'buildkit', name: 'BuildKit', repo: 'moby/buildkit' }
];
const RERUN = 'GITHUB_TOKEN=$(gh auth token) node scripts/update-data.mjs';
const MAX_RETRIES = 2;
const MAX_WAIT_SECONDS = 90;

export class StatsError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}\nsnapshot not written. Rerun: ${RERUN}`);
    this.code = code;
  }
}

async function request(url, { fetch, env, sleep }) {
  const token = env.GITHUB_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const tokenNote = `GITHUB_TOKEN ${token ? 'was set' : 'was not set'}`;
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetch(url, { headers });
    } catch (error) {
      if (attempt < MAX_RETRIES) { await sleep(2000 * (attempt + 1)); continue; }
      throw new StatsError('STATS_HTTP', `network failure for ${url}: ${error.message}; ${tokenNote}`);
    }
    if (response.ok) return response.json();
    const retryAfter = Number(response.headers?.get?.('retry-after'));
    const remaining = response.headers?.get?.('x-ratelimit-remaining');
    const reset = Number(response.headers?.get?.('x-ratelimit-reset'));
    const limited = response.status === 429 || (response.status === 403 && (remaining === '0' || retryAfter > 0));
    if (attempt < MAX_RETRIES && (limited || response.status >= 500)) {
      const wait = retryAfter > 0 ? retryAfter : reset ? Math.max(1, reset - Math.floor(Date.now() / 1000)) : 5;
      if (wait <= MAX_WAIT_SECONDS) { await sleep(wait * 1000); continue; }
    }
    let detail = '';
    try { detail = (await response.json()).message || ''; } catch { /* body is not JSON */ }
    const resetNote = reset ? `; rate limit resets ${new Date(reset * 1000).toISOString()}` : '';
    throw new StatsError(limited ? 'STATS_RATE_LIMIT' : 'STATS_HTTP', `HTTP ${response.status} for ${url} ${detail}${resetNote}; ${tokenNote}`);
  }
}

export async function searchAll(repo, kind, context) {
  const q = `repo:${repo} author:${LOGIN} is:${kind}`;
  const byId = new Map();
  let total = 0;
  for (let page = 1; page <= 10; page++) {
    const url = new URL('https://api.github.com/search/issues');
    url.search = new URLSearchParams({ q, sort: 'created', order: 'asc', per_page: '100', page: String(page) });
    const payload = await request(url.href, context);
    if (payload.incomplete_results) throw new StatsError('STATS_INCOMPLETE', `GitHub returned incomplete results for "${q}" page ${page}`);
    total = payload.total_count;
    if (total > 1000) throw new StatsError('STATS_INCOMPLETE', `"${q}" has ${total} results; search returns at most 1000`);
    for (const item of payload.items) byId.set(item.id, item);
    if (!payload.items.length || page * 100 >= total) break;
  }
  if (byId.size !== total) throw new StatsError('STATS_INCOMPLETE', `"${q}" returned ${byId.size} unique items of ${total}`);
  return [...byId.values()];
}

export async function run({ fetch, now, paths, env, sleep = ms => new Promise(r => setTimeout(r, ms)), log = console.log }) {
  let ledger;
  try {
    ledger = JSON.parse(await readFile(paths.ledger, 'utf8'));
  } catch (error) {
    throw new StatsError('STATS_LEDGER', `data/adoptions.json cannot be read: ${error.message}`);
  }
  const problems = validateLedger(ledger);
  if (problems.length) throw new StatsError('STATS_LEDGER', problems.join('\n'));

  const context = { fetch, env, sleep };
  const allIssues = [], allPulls = [], projects = [];
  for (const project of REPOSITORIES) {
    // Sequential on purpose: the search API has a low per-minute limit.
    const issues = await searchAll(project.repo, 'issue', context);
    const pulls = await searchAll(project.repo, 'pr', context);
    allIssues.push(...issues);
    allPulls.push(...pulls);
    projects.push({ ...project, issues: issues.length, pull_requests: pulls.length, total: issues.length + pulls.length });
  }

  const { counts, unlisted, unmatched } = countAdoption(allPulls, ledger);
  const outcomes = countIssues(allIssues);
  const generated = now().toISOString();
  const snapshot = {
    generated_at: generated,
    scope: REPOSITORIES.map(r => r.repo),
    totals: {
      issues: allIssues.length,
      pull_requests: allPulls.length,
      tracked_items: allIssues.length + allPulls.length,
      open_issues: outcomes.open,
      closed_issues: allIssues.length - outcomes.open,
      open_pull_requests: allPulls.filter(p => p.state === 'open').length,
      closed_pull_requests: allPulls.filter(p => p.state !== 'open').length
    },
    issue_outcomes: outcomes,
    projects,
    monthly: monthlySeries([...allIssues, ...allPulls], generated),
    adoption: {
      ...counts,
      method: 'Adopted means the maintainer discussion links the contribution to a landed upstream follow-up, release, or credited commit. It does not require the original contributor PR itself to be merged.'
    }
  };

  const warnings = [];
  for (const url of unlisted) warnings.push(`STATS_UNREVIEWED: ${url} has no entry; add one to data/adoptions.json`);
  for (const url of unmatched) warnings.push(`STATS_LEDGER: ${url} in data/adoptions.json matches no pull request by ${LOGIN} in the counted repositories`);
  for (const entry of ledger) {
    const pull = allPulls.find(p => normalizeUrl(p.html_url) === normalizeUrl(entry.url));
    // Only a change since the last hand check is news; a closed PR that still awaits its landing is normal.
    if (pull && entry.pr_state && pull.state !== entry.pr_state) {
      warnings.push(`STATS_CHANGED: ${entry.url} was ${entry.pr_state} at the ${entry.checked_on} check and is ${pull.state} now; review its entry in data/adoptions.json`);
    }
  }

  await writeFile(paths.out, `${JSON.stringify(snapshot, null, 2)}\n`);
  for (const warning of warnings) log(`::warning::${warning}`);
  if (warnings.length && env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, `${warnings.map(w => `- ${w}`).join('\n')}\n`);
  log(`Updated ${snapshot.totals.tracked_items} items across ${REPOSITORIES.length} repositories.`);
  return { snapshot, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const at = name => fileURLToPath(new URL(`../data/${name}`, import.meta.url));
  run({ fetch: globalThis.fetch, now: () => new Date(), env: process.env, paths: { ledger: at('adoptions.json'), out: at('contributions.json') } })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
