# NBA Season Lab Live

Full-stack NBA Monte Carlo dashboard. The server refreshes live inputs every five minutes, normalises team names, exposes provenance and source health, and preserves the editable local baseline when a feed is unavailable.

## Run
Requires Node.js 20+.

```bash
npm start
```
Open http://localhost:3000. Do not open index.html directly if you want live data.

## Live sources
- ESPN standings adapter: records, win percentage, point differential.
- NBA CDN schedule adapter: schedule availability and game count validation.
- Optional BALLDONTLIE injury adapter: set `BALLDONTLIE_API_KEY` in the host environment.

No API key is exposed to the browser. Results are cached for five minutes; upstream calls have an eight-second timeout. The UI displays freshness, latency, and adapter failures.

## Deploy
Render, Railway, Fly.io, Azure App Service, or any Node 20 host: start command `npm start`. Static-only hosts such as GitHub Pages cannot run the live backend. On Vercel, adapt `server.js` into a serverless function or deploy this package as a Node service elsewhere.

## Production recommendations
Use licensed feeds rather than scraping protected pages. Add database snapshots, historical back-testing, injury severity/minutes-loss estimates, market odds with vig removed, travel/rest and lineup data. Weight each signal using out-of-sample log loss or Brier score, not intuition.
