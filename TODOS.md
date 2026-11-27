# TODOS

## Page

### Contact line for job offers

**What:** A way to write to the owner from the page.

**Why:** A reader who wants to offer work has only the GitHub profile link.

**Context:** Publishing an address needs the owner's choice of address and consent. The owner chose to ship without it on 2026-11-27.

**Effort:** S
**Priority:** P3
**Depends on:** the owner

### Translated social previews

**What:** Russian and Polish link previews.

**Why:** Open Graph tags are English only, because one page serves all languages.

**Context:** Needs one page per language (`/ru/`, `/pl/`).

**Effort:** M
**Priority:** P3
**Depends on:** None

### Detect a stale translation

**What:** Fail a test when an English string changed and its translation did not.

**Why:** The key test checks presence and placeholders, not meaning.

**Context:** Store a hash of the English source beside each translation.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Booth

### Faster renders without a paid image API

**What:** Square output (1024×1024), the MCP check done once at worker start instead of per render, a third render slot, and template scenes passed to the model as a reference.

**Why:** Renders take 50–210 s; the owner chose to stay on Codex image generation (no paid API, no non-commercial face-swap model on the commercial site).

**Context:** Owner decision of 2026-10-22 ("C"). Square images are the fastest size per OpenAI's image docs. The double `codex mcp list` per render costs 2–4 s. Template scenes would make the composition consistent, as on ORLEN's stand.

**Effort:** M
**Priority:** P1
**Depends on:** None

### Hardening left from the pre-landing reviews

**What:** (1) A deploy revision compiled into `api.php` instead of `md5_file(__FILE__)`, which OPcache can fool; (2) on SIGTERM, wait for render threads or remove their generated-image directories; (3) IPv4-mapped `::ffff:` addresses keyed as IPv4 in `client_key()`; (4) keep `.lock` out of the 24 h sweep, sweep dot-file `.part` leftovers, prune expired `stats.ip` keys; (5) heartbeat on its own thread, stopped after repeated render failures so the page shows "offline"; (6) on a lost claim-upload response, release the claim; (7) skip claiming jobs too old to finish before the page's 900 s limit; (8) tests for the remaining untested paths (render timeout, storage 500, IPv6, day rollover, WORKERS cap, flock/SIGTERM, read failure, upload-retry exhaustion, DELIVERED branch, pixel-cap boundary).

**Why:** Each is a rare failure mode or a missing check found by the specialist, red-team, adversarial and Codex reviews of 0.1.5.0; the owner chose to ship the demo first and fix these next (decision "A", 2026-10-22).

**Context:** Findings are in the 0.1.5.0 review log of exGeni/exgenius-site (`gstack-review-read`). The stale admission comment in `api.php` and the stale test title in `booth-api.test.js` (a refused photo keeps the address attempt) belong here too.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Booth page polish

**What:** A progress bar that keeps moving and a later "the AI queue is busy" message; headings on the wait/result/error screens; share-failure feedback; a 2-column style grid below 360 px; footer/header text size and touch targets; safe-area insets; a distinct upload-error message.

**Why:** Design review findings on 0.1.5.0, none blocking.

**Context:** `targi-pracy/orlen/index.html`.

**Effort:** S
**Priority:** P3
**Depends on:** None
