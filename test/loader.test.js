import { test } from "node:test";
import assert from "node:assert/strict";
import { TEAMS } from "../site/js/baseline.js";
import { loadSnapshot } from "../site/js/loader.js";
import { fetchLiveEspn } from "../site/js/live.js";
import { espnParse } from "../site/js/teams.js";
import { ratingFromStats } from "../site/js/teams.js";

test("loader: merges a partial snapshot into the full 30-team roster", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({
      generatedAt: "2026-01-01T00:00:00.000Z",
      teams: [{ name: "Boston Celtics", rating: 95 }],
      sources: [{ name: "ESPN standings", status: "ok", latencyMs: 1, updatedAt: "2026-01-01T00:00:00.000Z" }]
    })
  }));

  const out = await loadSnapshot();
  assert.strictEqual(out.teams.length, 30, "roster must always stay complete");
  assert.strictEqual(out.source, "snapshot");
  assert.strictEqual(out.matched, 1);
  assert.strictEqual(out.teams.find((x) => x.name === "Boston Celtics").rating, 95);
  assert.strictEqual(out.teams.find((x) => x.name === "Utah Jazz").rating, 67, "unmatched teams keep baseline");
  assert.strictEqual(out.sources.length, 1);
});

test("loader: non-ok response falls back to the editable baseline", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 404 }));
  const out = await loadSnapshot();
  assert.strictEqual(out.source, "baseline");
  assert.strictEqual(out.teams.length, 30);
  assert.strictEqual(out.matched, 0);
  assert.strictEqual(out.teams.find((x) => x.name === "Boston Celtics").rating, 91);
});

test("loader: fetch rejection falls back to the editable baseline", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("network down");
  });
  const out = await loadSnapshot();
  assert.strictEqual(out.source, "baseline");
  assert.strictEqual(out.teams.length, 30);
  assert.strictEqual(out.generatedAt, null);
});

test("loader: returns independent team copies, shared module constant untouched", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ teams: [{ name: "Boston Celtics", rating: 95 }] })
  }));

  const out = await loadSnapshot();
  const boston = out.teams.find((x) => x.name === "Boston Celtics");
  boston.rating = 10;
  assert.strictEqual(out.teams.find((x) => x.name === "Boston Celtics").rating, 10);
  assert.strictEqual(TEAMS.find((x) => x.name === "Boston Celtics").rating, 91, "module constant immutable");
});

const ESPN_SAMPLE = {
  children: [
    {
      standings: {
        entries: [
          {
            team: { displayName: "Boston Celtics" },
            stats: [
              { name: "wins", value: 64 },
              { name: "losses", value: 18 },
              { name: "winPercent", value: 0.78 },
              { name: "pointDifferential", value: 8.4 }
            ]
          }
        ]
      }
    }
  ]
};

test("live: fetchLiveEspn parses the ESPN standings payload", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ESPN_SAMPLE }));
  const rows = await fetchLiveEspn(2000);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].name, "Boston Celtics");
  assert.strictEqual(rows[0].wins, 64);
  assert.strictEqual(rows[0].winPct, 0.78);
});

test("live: fetchLiveEspn returns null on non-ok response", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 503 }));
  assert.strictEqual(await fetchLiveEspn(2000), null);
});

test("live: fetchLiveEspn returns null on rejection", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("network down");
  });
  assert.strictEqual(await fetchLiveEspn(2000), null);
});

test("loader: live ESPN refresh applies calibrated ratings and switches source", async (t) => {
  const snapshotJson = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    teams: [{ name: "Boston Celtics", rating: 91 }],
    sources: [{ name: "ESPN standings", status: "ok", latencyMs: 1, updatedAt: "2026-01-01T00:00:00.000Z" }]
  };
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("site.api.espn.com")) {
      return { ok: true, json: async () => ESPN_SAMPLE };
    }
    return { ok: true, json: async () => snapshotJson };
  });

  const out = await loadSnapshot();
  assert.strictEqual(out.source, "live-espn");
  assert.strictEqual(out.live.length, 1);
  assert.strictEqual(out.teams.find((x) => x.name === "Boston Celtics").rating, ratingFromStats({ winPct: 0.78, pointDiff: 8.4 }));
});
