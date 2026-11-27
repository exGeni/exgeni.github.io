// Fails when a public card no longer matches GitHub. Run: GITHUB_TOKEN=... node scripts/check-claims.mjs
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function apiUrl(url) {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)$/.exec(url);
  if (!match) throw new Error(`STATS_CARD: not a GitHub issue or pull URL: ${url}`);
  const [, owner, repo, kind, number] = match;
  return `https://api.github.com/repos/${owner}/${repo}/${kind === 'pull' ? 'pulls' : 'issues'}/${number}`;
}

/** What GitHub must still say for each label. */
export async function checkCard(card, get) {
  const failures = [];
  if (card.label === 'awaiting_merge') {
    const pull = await get(apiUrl(card.pr_url));
    if (pull.state !== 'open') failures.push(`expected ${card.pr_url} to be open, it is ${pull.merged_at ? 'merged' : pull.state}`);
    if (card.milestone && pull.milestone?.title !== card.milestone) failures.push(`expected milestone ${card.milestone} on ${card.pr_url}, it is ${pull.milestone?.title ?? 'none'}`);
  } else {
    const landing = await get(apiUrl(card.landing_url));
    if (!landing.merged_at) failures.push(`expected ${card.landing_url} to be merged, it is not`);
  }
  return failures;
}

export async function checkCards(cards, get, log = console.log) {
  let failed = 0;
  for (const card of cards) {
    try {
      for (const failure of await checkCard(card, get)) {
        failed++;
        log(`::error::STATS_CARD: card ${card.id}: ${failure}; edit data/cards.json and the card in index.html`);
      }
    } catch (error) {
      log(`::warning::STATS_CARD: card ${card.id} not checked: ${error.message}`);
    }
  }
  return failed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cards = JSON.parse(await readFile(new URL('../data/cards.json', import.meta.url), 'utf8'));
  const token = process.env.GITHUB_TOKEN;
  const get = async url => {
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.json();
  };
  if (await checkCards(cards, get)) process.exitCode = 1;
  else console.log(`Checked ${cards.length} cards.`);
}
