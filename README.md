# exGeni — Open-source work

A static, English-first portfolio page for the public open-source work of `@exGeni`.

## Publish with GitHub Pages

1. Create a public repository named `exgeni.github.io` under the `exGeni` account.
2. Upload the contents of this folder to the repository root (keep `.github/`, `data/` and `scripts/`).
3. In **Settings → Pages**, select **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. The page will be available at `https://exgeni.github.io` after GitHub Pages finishes its first build.
5. The `Refresh contribution statistics` workflow updates issue/PR counts and monthly activity once a day. It uses the repository's built-in `GITHUB_TOKEN`; no personal token or secret is required.

## Data and methodology

- `data/contributions.json` is the automatically refreshed activity snapshot.
- `data/adoptions.json` is the manually curated evidence ledger for upstream adoption.
- The activity count is authored Issues + Pull Requests in `garrytan/gbrain`, `garrytan/gstack`, `garrytan/alphaclaw` and `openclaw/openclaw`.
- Upstream adoption is counted separately. These projects often close contributor PRs as superseded after a maintainer re-implements or ports the change into a fix wave. The adoption ledger counts those only when a maintainer comment links the contribution to a landed PR, release or credited commit.
- Closed does not automatically mean accepted. One PR is deliberately marked not adopted because maintainers already had a safer upstream implementation.
- November 2026 figures in the initial snapshot are month-to-date through 18 November.

## Local preview

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

No build step, framework, external chart library, analytics script or runtime backend is required.
