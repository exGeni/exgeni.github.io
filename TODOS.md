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
