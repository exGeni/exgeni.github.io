# exGeni — Open-source work

A static portfolio page for the public open-source work of `@exGeni`, in English, Russian and Polish.
Published by GitHub Pages from `main` at `https://exgeni.github.io`. A merge is public at once.

No build step, framework, chart library, analytics or backend.

## Develop

Node 22 or newer.

```sh
node --test              # all tests, no network
node tools/serve.mjs     # preview at http://127.0.0.1:8000/
```

`node tools/serve.mjs <state>` previews invented data: `unavailable`, `old`, `stale`, `unreviewed`, `months12`, `months24`.
Opening `index.html` as a file does not work (the page loads ES modules).

Refresh the figures locally (without a token GitHub's search limit is too low):

```sh
GITHUB_TOKEN=$(gh auth token) node scripts/update-data.mjs
```

```powershell
$env:GITHUB_TOKEN = gh auth token; node scripts/update-data.mjs
```

`node scripts/check-claims.mjs` compares every public card with GitHub.

## Data

| File | Kept by | Holds |
|---|---|---|
| `data/contributions.json` | script | `generated_at`, `scope`, `totals`, `issue_outcomes` (`completed`, `not_planned`, `open`, `other`), `projects`, `monthly` (`YYYY-MM`, every month), `adoption` (`adopted`, `awaiting_follow_up`, `not_adopted`, `not_reviewed`) |
| `data/adoptions.json` | hand | one entry per counted pull request: `url`, `status` (`adopted`, `awaiting`, `not-adopted`), optionally `pr_state` and `checked_on` from the last hand check |
| `data/cards.json` | hand | the selected cards: `id`, `order`, `label`, `issue_url`, `pr_url`, `landing_url`, `checked_on`, `milestone` |
| `data/projects.json` | hand | own projects: `id`, `name`, `open_url`, `source_url`, `description.{en,ru,pl}` |

Counted: issues and pull requests authored in `garrytan/gbrain`, `garrytan/gstack`, `garrytan/alphaclaw`,
`openclaw/openclaw` and `moby/buildkit` (the list is in `scripts/update-data.mjs`).

“Closed as completed” is GitHub's close reason, not a verified fix. Upstream adoption is separate: these
projects often close contributor pull requests as superseded after a maintainer ports the change, so the
ledger counts one only when a maintainer links it to a landed pull request, release or credited commit.

## Recipes

**Add a project.** Add an entry to `data/projects.json`, copy its `<article class="project-card">` block in
`index.html`, add the key `project.<id>` to `i18n/en.mjs`, `ru.json` and `pl.json`. `node --test` names
anything missing.

**Add or change a card.** Edit `data/cards.json` and the matching `<article class="case-row">` in
`index.html`; add its `card.<id>.*` keys to the three dictionaries. Labels: `authored_landed`,
`coauthored_landed`, `reported_fixed` (all need a merged `landing_url`), `awaiting_merge` (needs an open
`pr_url`). Say only what the card's links show.

**Add an adoption verdict.** One line in `data/adoptions.json`. The counts follow at the next refresh.

**Change a text.** Change it in `index.html` and `i18n/en.mjs` (a test keeps them equal), then in
`ru.json` and `pl.json`. A test cannot tell that a translation went stale: re-read both.

After changing `app.js`, `styles.css`, `lib/` or `i18n/`, raise the `?v=` number everywhere (a test
checks that they agree).

## Codes from the scripts

| Code | Meaning | What to do |
|---|---|---|
| `STATS_RATE_LIMIT` | GitHub refused for rate | wait until the printed reset, set `GITHUB_TOKEN`, rerun |
| `STATS_HTTP` | request or network failure | read the status and message, rerun |
| `STATS_INCOMPLETE` | search did not return everything | rerun; over 1000 results needs a new query |
| `STATS_LEDGER` | bad or unmatched `data/adoptions.json` entry | fix the named entry and field |
| `STATS_UNREVIEWED` | a pull request has no verdict | add it to `data/adoptions.json` |
| `STATS_CHANGED` | state differs from the last hand check | re-read it, update the entry |
| `STATS_CARD` | a public card no longer holds | edit `data/cards.json` and the card |

A failed refresh writes no snapshot; the page keeps the older one and says so after three days.

## Check before a merge

`node --test` passes, then by eye in `en`, `ru`, `pl` at desktop width and at 320px: no side scroll, the
switching the language keeps the reading position, cards fold on the phone; `unavailable`, `old`, `stale`, `unreviewed`,
`months12` and `months24` previews read correctly; with scripts off the text, projects and cards remain.

If `data/contributions.json` conflicts on rebase, rerun the refresh script instead of merging by hand.
After a merge run the “Refresh contribution statistics” workflow and open the live page. To undo, revert
the merge commit.
