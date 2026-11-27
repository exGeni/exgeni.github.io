// Pure counting rules shared by the refresh script, the page and the tests.

export const ADOPTION_STATUSES = ['adopted', 'awaiting', 'not-adopted'];

export function normalizeUrl(url) {
  return String(url).trim().replace(/\/+$/, '').toLowerCase();
}

export function countIssues(issues) {
  const counts = { total: issues.length, open: 0, completed: 0, not_planned: 0, other: 0 };
  for (const issue of issues) {
    if (issue.state === 'open') counts.open++;
    else if (issue.state_reason === 'completed') counts.completed++;
    else if (issue.state_reason === 'not_planned') counts.not_planned++;
    else counts.other++;
  }
  return counts;
}

function nextMonth(key) {
  const [year, month] = key.split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Every calendar month from the first item to the snapshot month, zeros included. */
export function monthlySeries(items, snapshotIso) {
  const rows = new Map();
  for (const item of items) {
    const key = item.created_at.slice(0, 7);
    const row = rows.get(key) || { month: key, issues: 0, pull_requests: 0, total: 0 };
    if (item.pull_request) row.pull_requests++;
    else row.issues++;
    row.total++;
    rows.set(key, row);
  }
  if (!rows.size) return [];
  const end = snapshotIso.slice(0, 7);
  const series = [];
  for (let key = [...rows.keys()].sort()[0]; key <= end; key = nextMonth(key)) {
    series.push(rows.get(key) || { month: key, issues: 0, pull_requests: 0, total: 0 });
  }
  return series;
}

/** Returns a list of readable problems; empty means the ledger is usable. */
export function validateLedger(ledger, file = 'data/adoptions.json') {
  if (!Array.isArray(ledger)) return [`${file}: expected an array`];
  const problems = [];
  const seen = new Set();
  ledger.forEach((entry, index) => {
    const where = `${file} entry ${index}`;
    if (!ADOPTION_STATUSES.includes(entry?.status)) {
      problems.push(`${where}: field "status" is ${JSON.stringify(entry?.status)}; allowed: ${ADOPTION_STATUSES.join(', ')}`);
    }
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/?$/i.test(entry?.url || '')) {
      problems.push(`${where}: field "url" is ${JSON.stringify(entry?.url)}; expected https://github.com/<owner>/<repo>/pull/<number>`);
      return;
    }
    const key = normalizeUrl(entry.url);
    if (seen.has(key)) problems.push(`${where}: field "url" ${entry.url} is listed twice`);
    seen.add(key);
  });
  return problems;
}

export function countAdoption(pulls, ledger) {
  const byUrl = new Map(ledger.map(entry => [normalizeUrl(entry.url), entry]));
  const counts = { adopted: 0, awaiting_follow_up: 0, not_adopted: 0, not_reviewed: 0 };
  const unlisted = [];
  const matched = new Set();
  for (const pull of pulls) {
    const entry = byUrl.get(normalizeUrl(pull.html_url));
    if (!entry) {
      counts.not_reviewed++;
      unlisted.push(pull.html_url);
      continue;
    }
    matched.add(normalizeUrl(entry.url));
    if (entry.status === 'adopted') counts.adopted++;
    else if (entry.status === 'awaiting') counts.awaiting_follow_up++;
    else counts.not_adopted++;
  }
  const unmatched = ledger.filter(entry => !matched.has(normalizeUrl(entry.url))).map(entry => entry.url);
  return { counts, unlisted, unmatched };
}

export function percentLabel(value, total) {
  if (!total || !value) return '0%';
  const share = (value / total) * 100;
  return share < 1 ? '<1%' : `${Math.round(share)}%`;
}
