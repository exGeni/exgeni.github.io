const fallback = {
  totals: { issues: 189, pull_requests: 18, tracked_items: 207, open_issues: 36, open_pull_requests: 1 },
  projects: [
    { name: 'GBrain', total: 98 }, { name: 'GStack', total: 79 },
    { name: 'AlphaClaw', total: 24 }, { name: 'OpenClaw', total: 6 }
  ],
  monthly: [
    { month: 'Jun', issues: 3, pull_requests: 0, total: 3 },
    { month: 'Jul', issues: 17, pull_requests: 2, total: 19 },
    { month: 'Aug', issues: 11, pull_requests: 2, total: 13 },
    { month: 'Sep', issues: 22, pull_requests: 4, total: 26 },
    { month: 'Oct', issues: 59, pull_requests: 6, total: 65 },
    { month: 'Nov*', issues: 77, pull_requests: 4, total: 81 }
  ],
  adoption: { adopted: 15, awaiting_follow_up: 2, not_adopted: 1 }
};

function el(id) { return document.getElementById(id); }
function renderMonthly(data) {
  const root = el('monthly-chart');
  if (!root) return;
  const max = Math.max(...data.map(x => x.total), 1);
  root.innerHTML = data.map(item => {
    const totalHeight = Math.max(4, (item.total / max) * 132);
    const issueHeight = item.total ? totalHeight * item.issues / item.total : 0;
    const prHeight = item.total ? totalHeight * item.pull_requests / item.total : 0;
    return `<div class="month-column"><span class="month-total">${item.total}</span><div class="month-bar" style="height:${totalHeight}px"><span class="issues" style="height:${issueHeight}px"></span><span class="prs" style="height:${prHeight}px"></span></div><span class="month-label">${item.month}</span></div>`;
  }).join('');
}
function renderCumulative(data) {
  const root = el('cumulative-chart');
  if (!root) return;
  let running = 0;
  const points = data.map((item, index) => {
    running += item.total;
    return { month: item.month, total: running, x: 24 + index * (552 / Math.max(1, data.length - 1)) };
  });
  const max = Math.max(...points.map(p => p.total), 1);
  const coords = points.map(p => ({ ...p, y: 70 - (p.total / max) * 48 }));
  const path = coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const markers = coords.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.3"></circle>`).join('');
  const first = coords[0];
  const last = coords[coords.length - 1];
  root.innerHTML = `<svg viewBox="0 0 600 88" preserveAspectRatio="none" aria-hidden="true"><path class="cumulative-grid" d="M24 70 H576 M24 22 H576"></path><path class="cumulative-area" d="${path} L ${last.x} 70 L ${first.x} 70 Z"></path><path class="cumulative-line" d="${path}"></path><g class="cumulative-points">${markers}</g><text x="24" y="85">${first.month}</text><text x="576" y="85" text-anchor="end">${last.month}</text><text x="576" y="13" text-anchor="end">${last.total}</text></svg>`;
  el('cumulative-total').textContent = running;
}
function renderProjects(projects) {
  const root = el('project-chart');
  if (!root) return;
  const max = Math.max(...projects.map(x => x.total), 1);
  root.innerHTML = projects.map(p => `<div class="project-row"><span class="project-name">${p.name}</span><span class="project-track"><i class="project-fill" style="width:${(p.total / max) * 100}%"></i></span><span class="project-value">${p.total}</span></div>`).join('');
}
function render(data) {
  const t = data.totals || fallback.totals;
  const a = data.adoption || fallback.adoption;
  el('total-items').textContent = t.tracked_items;
  el('issue-total').textContent = t.issues;
  el('pr-total').textContent = t.pull_requests;
  el('adopted-total').textContent = a.adopted;
  el('adopted-metric').textContent = a.adopted;
  el('awaiting-metric').textContent = a.awaiting_follow_up;
  el('open-issues').textContent = t.open_issues;
  el('open-prs').textContent = t.open_pull_requests;
  el('outcome-summary').textContent = `${a.adopted} adopted · ${a.awaiting_follow_up} awaiting follow-up · ${a.not_adopted} not adopted`;
  el('outcome-track').setAttribute('aria-label', `${a.adopted} adopted, ${a.awaiting_follow_up} awaiting follow-up, ${a.not_adopted} not adopted`);
  el('outcome-adopted').style.flex = String(a.adopted);
  el('outcome-awaiting').style.flex = String(a.awaiting_follow_up);
  el('outcome-not-adopted').style.flex = String(a.not_adopted);
  renderMonthly(data.monthly || fallback.monthly);
  renderCumulative(data.monthly || fallback.monthly);
  renderProjects(data.projects || fallback.projects);
}
render(fallback);
fetch('data/contributions.json', { cache: 'no-store' })
  .then(response => response.ok ? response.json() : Promise.reject(new Error('Snapshot unavailable')))
  .then(render)
  .catch(() => {});
