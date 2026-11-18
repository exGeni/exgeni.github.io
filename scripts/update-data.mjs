import { mkdir, writeFile } from 'node:fs/promises';

const login = 'exGeni';
const repositories = [
  { id: 'gbrain', name: 'GBrain', repo: 'garrytan/gbrain' },
  { id: 'gstack', name: 'GStack', repo: 'garrytan/gstack' },
  { id: 'alphaclaw', name: 'AlphaClaw', repo: 'garrytan/alphaclaw' },
  { id: 'openclaw', name: 'OpenClaw', repo: 'openclaw/openclaw' }
];
const headers = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
};

async function searchAll(repo, kind) {
  const q = `repo:${repo} author:${login} is:${kind}`;
  const items = [];
  for (let page = 1; page <= 10; page++) {
    const url = new URL('https://api.github.com/search/issues');
    url.searchParams.set('q', q);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`GitHub search failed (${response.status}) for ${q}`);
    const payload = await response.json();
    items.push(...(payload.items || []));
    if (items.length >= payload.total_count || (payload.items || []).length < 100) break;
  }
  return items;
}

const byMonth = new Map();
const projectStats = [];
let totalIssues = 0, totalPRs = 0, openIssues = 0, closedIssues = 0, openPRs = 0, closedPRs = 0;
for (const project of repositories) {
  const [issues, prs] = await Promise.all([
    searchAll(project.repo, 'issue'),
    searchAll(project.repo, 'pr')
  ]);
  totalIssues += issues.length;
  totalPRs += prs.length;
  openIssues += issues.filter(x => x.state === 'open').length;
  closedIssues += issues.filter(x => x.state === 'closed').length;
  openPRs += prs.filter(x => x.state === 'open').length;
  closedPRs += prs.filter(x => x.state === 'closed').length;
  for (const item of [...issues, ...prs]) {
    const key = item.created_at.slice(0, 7);
    const row = byMonth.get(key) || { month: key, issues: 0, pull_requests: 0, total: 0 };
    if (item.pull_request) row.pull_requests++;
    else row.issues++;
    row.total++;
    byMonth.set(key, row);
  }
  projectStats.push({
    id: project.id, name: project.name, repo: project.repo,
    issues: issues.length, pull_requests: prs.length,
    total: issues.length + prs.length
  });
}

const monthly = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map(row => ({
  ...row,
  month: new Date(`${row.month}-01T00:00:00Z`).toLocaleString('en', { month: 'short', timeZone: 'UTC' }) +
    (row.month === new Date().toISOString().slice(0, 7) ? '*' : '')
}));
const previous = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../data/contributions.json', import.meta.url), 'utf8'));
const snapshot = {
  generated_at: new Date().toISOString(),
  scope: repositories.map(x => x.repo),
  totals: {
    issues: totalIssues, pull_requests: totalPRs, tracked_items: totalIssues + totalPRs,
    open_issues: openIssues, closed_issues: closedIssues,
    open_pull_requests: openPRs, closed_pull_requests: closedPRs
  },
  projects: projectStats,
  monthly,
  adoption: previous.adoption
};
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/contributions.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Updated ${snapshot.totals.tracked_items} items across ${repositories.length} repositories.`);
