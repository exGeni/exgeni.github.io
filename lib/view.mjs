// Data in, view model out. The page only paints what these functions return.

const num = value => (Number.isFinite(value) ? value : null);

export const STALE_AFTER_DAYS = 3;

export function viewModel(data, now = new Date()) {
  const totals = data?.totals || {};
  const issues = data?.issue_outcomes || {};
  const adoption = data?.adoption || {};
  const generated = Date.parse(data?.generated_at);
  const monthly = Array.isArray(data?.monthly) && data.monthly.every(row => Number.isFinite(row?.total) && typeof row.month === 'string') ? data.monthly : null;
  const projects = Array.isArray(data?.projects) && data.projects.every(p => Number.isFinite(p?.total) && typeof p.name === 'string') ? data.projects : null;
  const outcomes = ['adopted', 'awaiting_follow_up', 'not_adopted', 'not_reviewed'].map(key => num(adoption[key]));
  return {
    figures: {
      tracked: num(totals.tracked_items),
      issues: num(totals.issues),
      pulls: num(totals.pull_requests),
      openIssues: num(totals.open_issues),
      openPulls: num(totals.open_pull_requests),
      completed: num(issues.completed),
      notPlanned: num(issues.not_planned),
      other: num(issues.other),
      adopted: num(adoption.adopted),
      awaiting: num(adoption.awaiting_follow_up)
    },
    repositories: Array.isArray(data?.scope) ? data.scope.length : null,
    outcomes: outcomes.every(value => value !== null)
      ? { adopted: outcomes[0], awaiting: outcomes[1], notAdopted: outcomes[2], notReviewed: outcomes[3] }
      : null,
    monthly: monthly && monthly.length ? monthly : null,
    projects: projects && projects.length ? projects : null,
    generatedAt: Number.isNaN(generated) ? null : new Date(generated),
    stale: !Number.isNaN(generated) && now - generated > STALE_AFTER_DAYS * 86400000
  };
}

/** The months drawn as columns: the last 12, or 6 on a narrow screen. */
export function visibleMonths(monthly, narrow) {
  return monthly.slice(narrow ? -6 : -12);
}

export function cumulative(monthly) {
  let running = 0;
  return monthly.map(row => ({ month: row.month, total: (running += row.total) }));
}

/** First, every January and the last; a label too close to the previous kept one is dropped, the last wins. */
export function cumulativeLabelIndexes(months, minGap = 2) {
  if (!months.length) return [];
  const last = months.length - 1;
  const wanted = months.map((m, i) => (i === 0 || i === last || m.endsWith('-01') ? i : -1)).filter(i => i >= 0);
  const kept = [];
  for (const i of wanted) {
    if (kept.length && i - kept[kept.length - 1] < minGap) {
      if (i !== last) continue;
      kept.pop();
    }
    kept.push(i);
  }
  return kept;
}
