// The static page must agree with the dictionaries and the manifests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import english from '../i18n/en.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const html = await read('index.html');
const decode = text => text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
const placeholders = value => [...new Set(JSON.stringify(value).match(/\{\w+\}/g) || [])].sort();

const textKeys = [...html.matchAll(/<(\w+)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>([^<]*)<\/\1>/g)];
const attrKeys = [...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap(m => m[1].split(';').map(pair => pair.split(':')[1]));

test('English in index.html equals the English module', () => {
  assert.equal(textKeys.length, (html.match(/\sdata-i18n="/g) || []).length, 'every data-i18n element holds plain text only');
  for (const [, , key, text] of textKeys) assert.equal(decode(text), english[key], key);
  for (const key of attrKeys) assert.ok(english[key], key);
});

for (const lang of ['ru', 'pl']) {
  test(`${lang} has every key, the same placeholders and its plural forms`, async () => {
    const dictionary = await json(`i18n/${lang}.json`);
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(english).sort());
    for (const [key, value] of Object.entries(english)) {
      assert.deepEqual(placeholders(dictionary[key]), placeholders(value), key);
      if (typeof value === 'object') assert.deepEqual(Object.keys(dictionary[key]).sort(), ['few', 'many', 'one', 'other'], key);
      assert.ok(JSON.stringify(dictionary[key]).length > 2, key);
    }
  });
}

test('cards match data/cards.json: order, label, links, date', async () => {
  const cards = (await json('data/cards.json')).sort((a, b) => a.order - b.order);
  const blocks = [...html.matchAll(/<article class="case-row" data-card="([^"]+)">([\s\S]*?)<\/article>/g)];
  assert.deepEqual(blocks.map(b => b[1]), cards.map(c => c.id));
  for (const [index, card] of cards.entries()) {
    const body = blocks[index][2];
    assert.ok(body.includes(`data-i18n="label.${card.label}"`), `${card.id} label`);
    const links = [...body.matchAll(/href="([^"]+)"/g)].map(m => m[1]).sort();
    assert.deepEqual(links, [card.issue_url, card.pr_url, card.landing_url].filter(Boolean).sort(), `${card.id} links`);
    assert.ok(body.includes(`datetime="${card.checked_on}"`), `${card.id} date`);
    assert.ok(links.every(url => url.startsWith('https://')));
  }
});

test('projects match data/projects.json and have three languages', async () => {
  const projects = await json('data/projects.json');
  const blocks = [...html.matchAll(/<article class="project-card" data-project="([^"]+)">([\s\S]*?)<\/article>/g)];
  assert.deepEqual(blocks.map(b => b[1]), projects.map(p => p.id));
  for (const [index, project] of projects.entries()) {
    const body = blocks[index][2];
    for (const url of [project.open_url, project.source_url]) {
      assert.match(url, /^https:\/\//);
      assert.ok(body.includes(`href="${url}"`), url);
    }
    for (const lang of ['en', 'ru', 'pl']) {
      const dictionary = lang === 'en' ? english : await json(`i18n/${lang}.json`);
      assert.equal(dictionary[`project.${project.id}`], project.description[lang], `${project.id} ${lang}`);
    }
  }
});

test('assets share one version and no typed-in figures remain', async () => {
  const app = await read('app.js');
  const versions = new Set([...`${html}\n${app}`.matchAll(/\?v=(\w+)/g)].map(m => m[1]));
  assert.equal(versions.size, 1);
  for (const id of ['total-items', 'completed-total', 'adopted-total', 'adopted-metric', 'awaiting-metric', 'open-issues', 'open-prs']) {
    assert.match(html, new RegExp(`id="${id}" data-figure>–<`));
  }
  assert.doesNotMatch(app, /innerHTML/);
});

test('the committed snapshot has the shape the page reads', async () => {
  const { viewModel } = await import('../lib/view.mjs');
  const model = viewModel(await json('data/contributions.json'));
  assert.ok(Object.values(model.figures).every(Number.isFinite));
  assert.ok(model.outcomes && model.monthly && model.projects);
  assert.equal(model.repositories, model.projects.length);
});
