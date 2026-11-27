import test from 'node:test';
import assert from 'node:assert/strict';
import { countAdoption, countIssues, monthlySeries, percentLabel, validateLedger } from '../lib/stats.mjs';
import { cumulative, cumulativeLabelIndexes, viewModel, visibleMonths } from '../lib/view.mjs';
import { monthLabel, pickLanguage, plural, translator } from '../lib/i18n.mjs';

const pull = n => `https://github.com/a/b/pull/${n}`;
const item = (created_at, pr) => ({ created_at, ...(pr ? { pull_request: {} } : {}) });

test('issue outcomes: anything without a known reason is "other"', () => {
  const counts = countIssues([
    { state: 'open' }, { state: 'closed', state_reason: 'completed' }, { state: 'closed', state_reason: 'not_planned' },
    { state: 'closed', state_reason: 'duplicate' }, { state: 'closed', state_reason: null }
  ]);
  assert.deepEqual(counts, { total: 5, open: 1, completed: 1, not_planned: 1, other: 2 });
});

test('adoption is matched by URL; unlisted and unmatched are reported', () => {
  const result = countAdoption(
    [{ html_url: pull(1) }, { html_url: pull(2) }, { html_url: pull(3) }],
    [{ url: `${pull(1)}/`, status: 'adopted' }, { url: pull(2).toUpperCase().replace('HTTPS', 'https'), status: 'awaiting' }, { url: pull(9), status: 'not-adopted' }]
  );
  assert.deepEqual(result.counts, { adopted: 1, awaiting_follow_up: 1, not_adopted: 0, not_reviewed: 1 });
  assert.deepEqual(result.unlisted, [pull(3)]);
  assert.deepEqual(result.unmatched, [pull(9)]);
});

test('a mistyped status or a duplicate URL is named', () => {
  const problems = validateLedger([{ url: pull(1), status: 'adoped' }, { url: `${pull(1)}/`, status: 'adopted' }, { url: 'x', status: 'adopted' }]);
  assert.equal(problems.length, 3);
  assert.match(problems[0], /entry 0: field "status" is "adoped"; allowed: adopted/);
  assert.match(problems[1], /listed twice/);
  assert.match(problems[2], /field "url" is "x"/);
});

test('months are calendar months, zeros included, across January', () => {
  const series = monthlySeries([item('2026-11-02', false), item('2027-02-01', true)], '2027-02-10T00:00:00Z');
  assert.deepEqual(series.map(r => `${r.month}:${r.total}`), ['2026-11:1', '2026-12:0', '2027-01:0', '2027-02:1']);
});

test('7 and 13 months: 12 columns at most, 6 when narrow, cumulative keeps all', () => {
  const months = n => Array.from({ length: n }, (_, i) => ({ month: `${2026 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, total: 1 }));
  assert.equal(visibleMonths(months(7), false).length, 7);
  assert.equal(visibleMonths(months(13), false).length, 12);
  assert.equal(visibleMonths(months(13), true).length, 6);
  assert.equal(cumulative(months(13)).at(-1).total, 13);
});

test('cumulative labels: adjacent December and January do not collide, the last wins', () => {
  assert.deepEqual(cumulativeLabelIndexes(['2026-12', '2027-01', '2027-02', '2027-03']), [0, 3]);
  assert.deepEqual(cumulativeLabelIndexes(['2026-10', '2026-11', '2026-12', '2027-01']), [0, 3]);
});

test('a share under one percent is not shown as zero', () => {
  assert.equal(percentLabel(1, 226), '<1%');
  assert.equal(percentLabel(107, 224), '48%');
  assert.equal(percentLabel(0, 224), '0%');
});

test('view model: old-shape and partial data give nulls, never zeros', () => {
  const old = viewModel({ generated_at: '2026-11-26T00:00:00Z', totals: { tracked_items: 219 }, adoption: { adopted: 15 } }, new Date('2026-11-27T00:00:00Z'));
  assert.equal(old.figures.tracked, 219);
  assert.equal(old.figures.completed, null);
  assert.equal(old.outcomes, null);
  assert.equal(old.monthly, null);
  assert.equal(old.stale, false);
  const partial = viewModel({ monthly: [{ month: '2026-11' }], projects: [{ name: 'x' }] });
  assert.equal(partial.monthly, null);
  assert.equal(partial.projects, null);
  assert.equal(viewModel({ generated_at: '2026-11-01T00:00:00Z' }, new Date('2026-11-27T00:00:00Z')).stale, true);
});

test('language: ?lang wins, then the first supported browser language, else English', () => {
  assert.equal(pickLanguage('?lang=pl', ['ru']), 'pl');
  assert.equal(pickLanguage('?lang=de', ['uk-UA', 'ru-RU', 'en']), 'ru');
  assert.equal(pickLanguage('', ['de-DE']), 'en');
});

test('Russian and Polish plural forms', () => {
  const ru = { one: '{n} проект', few: '{n} проекта', many: '{n} проектов', other: '{n} проекта' };
  const pl = { one: '{n} projekt', few: '{n} projekty', many: '{n} projektów', other: '{n} projektu' };
  const counts = [0, 1, 2, 5, 11, 12, 21, 22, 25, 101];
  assert.deepEqual(counts.map(n => plural('ru', n, ru).split(' ')[1]),
    ['проектов', 'проект', 'проекта', 'проектов', 'проектов', 'проектов', 'проект', 'проекта', 'проектов', 'проект']);
  assert.deepEqual(counts.map(n => plural('pl', n, pl).split(' ')[1]),
    ['projektów', 'projekt', 'projekty', 'projektów', 'projektów', 'projektów', 'projektów', 'projekty', 'projektów', 'projektów']);
});

test('a missing key falls back to English, per key', () => {
  const t = translator('ru', { a: 'да' }, { a: 'yes', b: 'no {n}', c: { one: '{n} item', other: '{n} items' } });
  assert.equal(t('a'), 'да');
  assert.equal(t('b', { n: 2 }), 'no 2');
  assert.equal(t('c', { n: 5 }), '5 items');
});

test('month labels are formatted in UTC and carry the year on the first column and January', () => {
  assert.deepEqual(monthLabel('en', '2027-01', false), { month: 'Jan', year: '2027' });
  assert.deepEqual(monthLabel('en', '2026-03', false), { month: 'Mar', year: '' });
  assert.deepEqual(monthLabel('en', '2026-03', true), { month: 'Mar', year: '2026' });
  assert.deepEqual(monthLabel('en', 'Nov*', true), { month: 'Nov*', year: '' });
});
