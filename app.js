import english from './i18n/en.mjs?v=8';
import { formatDate, LANGUAGES, monthLabel, pickLanguage, translator } from './lib/i18n.mjs?v=8';
import { cumulative, cumulativeLabelIndexes, viewModel, visibleMonths } from './lib/view.mjs?v=8';
import { percentLabel } from './lib/stats.mjs?v=8';

const el = id => document.getElementById(id);
const narrow = window.matchMedia('(max-width: 620px)');
const lang = pickLanguage(location.search, navigator.languages || [navigator.language]);
let activeLang = 'en';
let t = translator('en', null, english);
let model = null;
let failed = false;
let languageRequest = 0;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function svg(tag, attributes) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}
function setText(id, text) {
  const element = el(id);
  if (element) element.textContent = text;
}

function applyStrings() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const value = t(element.dataset.i18n);
    if (value !== undefined) element.textContent = value;
  });
  document.querySelectorAll('[data-i18n-attr]').forEach(element => {
    for (const pair of element.dataset.i18nAttr.split(';')) {
      const [name, key] = pair.split(':');
      const value = t(key);
      if (value !== undefined) element.setAttribute(name, value);
    }
  });
  document.querySelectorAll('time[datetime]').forEach(element => {
    element.textContent = formatDate(activeLang, new Date(`${element.dateTime}T00:00:00Z`));
  });
  document.documentElement.lang = activeLang;
}

function updateSwitcher() {
  document.querySelectorAll('[data-lang]').forEach(link => {
    if (link.dataset.lang === activeLang) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

function section(name, ready, paint) {
  const root = document.querySelector(`[data-section="${name}"]`);
  if (!root) return;
  const notice = root.querySelector('.section-notice');
  const body = root.querySelector('.section-body');
  let broken = failed || (model !== null && !ready);
  if (!broken && model) {
    try { paint(); } catch (error) { console.error(`render failed: ${name}`, error); broken = true; }
  }
  if (notice) { notice.hidden = !broken; notice.textContent = broken ? t('unavailable') : ''; }
  if (body) body.hidden = broken;
}

function renderFigures() {
  const figures = model?.figures;
  const map = {
    'total-items': 'tracked', 'completed-total': 'completed', 'adopted-total': 'adopted', 'adopted-metric': 'adopted',
    'awaiting-metric': 'awaiting', 'open-issues': 'openIssues', 'open-prs': 'openPulls'
  };
  for (const [id, key] of Object.entries(map)) {
    const value = figures?.[key];
    const element = el(id);
    if (!element) continue;
    const unknown = failed || (model && value === null);
    element.textContent = unknown ? '–' : value ?? '–';
    if (unknown) element.title = t('unavailable'); else element.removeAttribute('title');
  }
  const parts = figures && [figures.issues, figures.completed, figures.openIssues, figures.notPlanned, figures.other];
  setText('issues-line', parts && parts.every(v => v !== null)
    ? t('issuesLine', { n: figures.issues, completed: figures.completed, open: figures.openIssues, notPlanned: figures.notPlanned, other: figures.other })
    : '');
  setText('snapshot-date', model?.generatedAt ? t('snapshot', { date: formatDate(activeLang, model.generatedAt) }) : '');
  setText('projects-count', model?.repositories ? t('projectsCount', { n: model.repositories }) : '');
  const notice = el('data-notice');
  if (notice) {
    const message = failed || (model && model.figures.tracked === null) ? t('unavailable') : model?.stale ? t('stale') : '';
    notice.textContent = message;
    notice.hidden = !message;
  }
}

function renderMonthly() {
  const root = el('monthly-chart');
  const rows = visibleMonths(model.monthly, narrow.matches);
  const max = Math.max(...rows.map(row => row.total), 1);
  root.style.setProperty('--columns', rows.length);
  root.replaceChildren(...rows.map((row, index) => {
    const column = node('div', 'month-column');
    const height = row.total ? Math.max(4, (row.total / max) * 132) : 0;
    const bar = node('div', 'month-bar');
    bar.style.height = `${height}px`;
    if (!row.total) bar.style.minHeight = '0';
    for (const [className, value] of [['issues', row.issues], ['prs', row.pull_requests]]) {
      const part = node('span', className);
      part.style.height = `${row.total ? (height * value) / row.total : 0}px`;
      bar.append(part);
    }
    const { month, year } = monthLabel(activeLang, row.month, index === 0);
    const label = node('span', 'month-label', month);
    label.append(node('span', 'month-year', year || ' '));
    column.append(node('span', 'month-total', row.total), bar, label);
    return column;
  }));
  const first = monthLabel(activeLang, rows[0].month, true);
  const last = monthLabel(activeLang, rows[rows.length - 1].month, true);
  setText('chart-period', `${first.month} ${first.year} — ${last.month} ${last.year}`);
  setText('monthly-foot', t('monthlyFoot'));
  setText('through-date', model.generatedAt ? t('through', { date: formatDate(activeLang, model.generatedAt) }) : '');
}

function renderCumulative() {
  const points = cumulative(model.monthly);
  const max = Math.max(points[points.length - 1].total, 1);
  const x = i => (points.length === 1 ? 300 : 4 + (i * 592) / (points.length - 1));
  const coords = points.map((p, i) => ({ x: x(i), y: 66 - (p.total / max) * 56 }));
  const line = coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const chart = svg('svg', { viewBox: '0 0 600 72', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  chart.append(
    svg('path', { class: 'cumulative-grid', d: 'M0 66 H600 M0 10 H600' }),
    svg('path', { class: 'cumulative-area', d: `${line} L ${coords[coords.length - 1].x} 66 L ${coords[0].x} 66 Z` }),
    svg('path', { class: 'cumulative-line', d: line })
  );
  el('cumulative-chart').replaceChildren(chart);
  const labels = cumulativeLabelIndexes(points.map(p => p.month), Math.max(2, Math.ceil(points.length / (narrow.matches ? 4 : 8))));
  el('cumulative-labels').replaceChildren(...labels.map((i, position) => {
    const { month, year } = monthLabel(activeLang, points[i].month, true);
    const label = node('span', position === 0 ? 'first' : position === labels.length - 1 ? 'last' : '', `${month} ${year}`);
    label.style.left = `${(x(i) / 600) * 100}%`;
    return label;
  }));
  setText('cumulative-total', points[points.length - 1].total);
}

function renderOutcomes() {
  const o = model.outcomes;
  let summary = t('outcomeSummary', { adopted: o.adopted, awaiting: o.awaiting, notAdopted: o.notAdopted });
  if (o.notReviewed) summary += t('outcomeUnreviewed', { n: o.notReviewed });
  setText('outcome-summary', summary);
  el('outcome-track').setAttribute('aria-label', summary);
  for (const [id, value] of [['outcome-adopted', o.adopted], ['outcome-awaiting', o.awaiting], ['outcome-not-adopted', o.notAdopted], ['outcome-not-reviewed', o.notReviewed]]) {
    el(id).style.flex = String(value);
    el(id).hidden = !value;
  }
  document.querySelector('.legend-not-reviewed-item').hidden = !o.notReviewed;
}

function renderProjects() {
  const colors = ['#315f9f', '#6485ad', '#287b73', '#a2afbf', '#1d3b63'];
  const projects = model.projects;
  const total = projects.reduce((sum, p) => sum + p.total, 0);
  const circumference = 2 * Math.PI * 64;
  const chart = svg('svg', { viewBox: '0 0 180 180', 'aria-hidden': 'true' });
  chart.append(svg('circle', { class: 'donut-track', cx: 90, cy: 90, r: 64 }));
  let offset = 0;
  projects.forEach((p, i) => {
    const share = total ? (p.total / total) * circumference : 0;
    const length = p.total ? Math.max(share, 3) : 0;
    chart.append(svg('circle', { class: 'donut-segment', cx: 90, cy: 90, r: 64, stroke: colors[i % colors.length], 'stroke-dasharray': `${length} ${circumference - length}`, 'stroke-dashoffset': -Math.min(offset, circumference - length) }));
    offset += share;
  });
  const donut = node('div', 'project-donut');
  donut.setAttribute('role', 'img');
  donut.setAttribute('aria-label', t('donutLabel', { list: projects.map(p => `${p.name} ${p.total}`).join(', ') }));
  const center = node('div', 'donut-center');
  center.append(node('strong', '', total), node('span', '', t('donutTotal')));
  donut.append(chart, center);
  const legend = node('div', 'project-legend');
  legend.append(...projects.map((p, i) => {
    const row = node('div', 'project-legend-row');
    const swatch = node('i', 'project-swatch');
    swatch.style.background = colors[i % colors.length];
    const value = node('span', 'project-legend-value', p.total);
    value.append(node('small', '', percentLabel(p.total, total)));
    row.append(swatch, node('span', 'project-legend-name', p.name), value);
    return row;
  }));
  el('project-chart').replaceChildren(donut, legend);
}

function render() {
  try { renderFigures(); } catch (error) { console.error('render failed: figures', error); }
  section('monthly', model?.monthly, () => { renderMonthly(); renderCumulative(); });
  section('outcomes', model?.outcomes, renderOutcomes);
  section('projects', model?.projects, renderProjects);
}

function foldDetails() {
  document.querySelectorAll('.case-details').forEach(details => { details.open = !narrow.matches; });
}

/** Repaints the page in one language. Returns false when the dictionary cannot be loaded. */
async function showLanguage(code) {
  const request = ++languageRequest;
  const url = `i18n/${code}.json?v=8`;
  try {
    let dictionary = null;
    if (code !== 'en') {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      dictionary = await response.json();
    }
    if (request !== languageRequest) return null;
    activeLang = code;
    t = translator(code, dictionary, english);
    applyStrings();
    updateSwitcher();
    render();
    return true;
  } catch (error) {
    console.error(`dictionary failed: ${url}`, error);
    return request === languageRequest ? false : null;
  }
}

async function loadLanguage() {
  if (lang !== 'en' && LANGUAGES.includes(lang) && await showLanguage(lang) && location.hash) {
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
  updateSwitcher();
  document.documentElement.classList.remove('i18n-hold');
}

// Switching in place: no reload, no jump to the last anchor, the reader stays where they were.
function onLanguageClick(event) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  const code = event.currentTarget.dataset.lang;
  // The innermost block that starts at or above the top edge and is still on screen.
  const visible = [...document.querySelectorAll('.site-header, main section, .case-row')]
    .filter(element => element.getBoundingClientRect().bottom > 1);
  const anchor = visible.filter(element => element.getBoundingClientRect().top <= 1).pop() || visible[0];
  const offset = anchor?.getBoundingClientRect().top;
  showLanguage(code).then(shown => {
    if (shown === null) return;
    if (!shown) { location.search = `?lang=${code}`; return; }
    history.replaceState(null, '', `?lang=${code}`);
    if (anchor) window.scrollBy({ top: anchor.getBoundingClientRect().top - offset, behavior: 'instant' });
  });
}

async function loadData() {
  const url = 'data/contributions.json';
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    model = viewModel(await response.json());
  } catch (error) {
    console.error(`fetch failed: ${url}`, error);
    failed = true;
  }
  render();
}

applyStrings();
updateSwitcher();
foldDetails();
document.querySelectorAll('[data-lang]').forEach(link => link.addEventListener('click', onLanguageClick));
narrow.addEventListener('change', () => { foldDetails(); render(); });
loadLanguage();
loadData();
