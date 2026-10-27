# NBA Season Lab Live

Full-stack NBA Monte Carlo dashboard — now deployable on GitHub Pages.

The server refreshes live inputs every five minutes, normalises team names, exposes provenance and source health, and preserves the editable local baseline when a feed is unavailable.

## Layout

```
site/              # GitHub Pages artifact (static frontend)
scripts/           # server-side data pipeline (runs in GitHub Actions)
data/              # committed snapshots + historical archive
test/              # unit tests for the simulation engine
server.js          # local dev server (Node 20)
```

## Run locally

Requires Node.js 20+.

```bash
npm start
# open http://localhost:3000
```

`npm run dev` restarts on file changes. `npm run snapshot` rebuilds `data/snapshot.json` from upstream (ESPN standings, NBA CDN schedule, optional BallDontLie injuries). `npm test` runs the simulation engine test suite.

## Live sources

- ESPN standings adapter: records, win percentage, point differential.
- NBA CDN schedule adapter: schedule availability and game count validation.
- Optional BallDontLie injury adapter: set `BALLDONTLIE_API_KEY` (only in the Actions snapshot job — never exposed to the browser).

No API key is exposed to the browser. Results are cached for five minutes; upstream calls have an eight-second timeout. The UI displays freshness, latency, and adapter failures.

## Deploy to GitHub Pages

1. Push to `main`. Two workflows run:
   - `.github/workflows/snapshot.yml` — on a cron (every 30 minutes) and on `workflow_dispatch`, fetches upstream data, validates it, and commits `data/snapshot.json` plus a dated copy under `data/history/` (for back-testing).
   - `.github/workflows/pages-deploy.yml` — on push to `main`, runs the test suite, then deploys `site/` to GitHub Pages via `actions/deploy-pages`.
2. In the repository settings: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The site becomes available at `https://<user>.github.io/<repo>/`.

Static-only hosts such as GitHub Pages cannot run a live Node backend, so the frontend loads `./data/snapshot.json` committed by the Actions job and falls back to the editable local baseline if it can't be reached.

## Production recommendations

Use licensed feeds rather than scraping protected pages. Add database snapshots, historical back-testing, injury severity/minutes-loss estimates, market odds with vig removed, travel/rest and lineup data. Weight each signal using out-of-sample log loss or Brier score, not intuition.

## Data pipeline (local)

```bash
BALLDONTLIE_API_KEY=... npm run snapshot
```

Writes `data/snapshot.json` (latest) and appends `data/history/YYYY-MM-DD.json`.
