import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  normalize,
  espnParse,
  ratingFromStats,
  buildSnapshot,
  writeSnapshot
} from "../scripts/build-snapshot.mjs";

test("normalize: applies team aliases", () => {
  assert.strictEqual(normalize("NY Knicks"), "New York Knicks");
  assert.strictEqual(normalize("LA Clippers"), "Los Angeles Clippers");
  assert.strictEqual(normalize("Golden State"), "Golden State Warriors");
});

test("normalize: passes unknown names through unchanged", () => {
  assert.strictEqual(normalize("Boston Celtics"), "Boston Celtics");
});

const ESPN_SAMPLE = {
  children: [
    {
      standings: {
        entries: [
          {
            team: { displayName: "NY Knicks" },
            stats: [
              { name: "wins", value: 50 },
              { name: "losses", value: 32 },
              { name: "winPercent", value: 0.61 },
              { name: "pointDifferential", value: 3.1 }
            ]
          },
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

test("espnParse: extracts rows, aliases names, coerces numbers", () => {
  const rows = espnParse(ESPN_SAMPLE);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].name, "New York Knicks");
  assert.strictEqual(rows[0].wins, 50);
  assert.strictEqual(rows[0].losses, 32);
  assert.strictEqual(rows[1].winPct, 0.78);
  assert.strictEqual(rows[1].pointDiff, 8.4);
  assert.strictEqual(rows[1].source, "ESPN standings");
});

test("espnParse: tolerates malformed payloads", () => {
  assert.deepStrictEqual(espnParse({}), []);
  assert.deepStrictEqual(espnParse({ children: [{}] }), []);
});

test("ratingFromStats: follows the calibrated formula", () => {
  assert.strictEqual(ratingFromStats({ winPct: 0.61, pointDiff: 3.1 }), 87);
});

test("ratingFromStats: clamps at both ends", () => {
  const high = ratingFromStats({ winPct: 1, pointDiff: 20 });
  const low = ratingFromStats({ winPct: 0, pointDiff: -40 });
  assert.strictEqual(high, 100);
  assert.strictEqual(low, 55);
});

test("buildSnapshot: degrades gracefully when all sources fail", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("upstream unreachable");
  });

  const snapshot = await buildSnapshot();
  assert.strictEqual(snapshot.teams.length, 0);
  assert.ok(snapshot.warning, "warning must be set when standings are incomplete");
  assert.ok(snapshot.sources.every((s) => s.status === "error"));
});

test("buildSnapshot: ingests ESPN data with stubbed fetch", async (t) => {
  const sampleMap = new Map([
    [
      "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?region=us&lang=en&contentorigin=espn&type=0&level=2",
      ESPN_SAMPLE
    ],
    ["https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json", { leagueSchedule: { gameDates: [{ games: [{}] }, { games: [{}] }] } }]
  ]);

  t.mock.method(globalThis, "fetch", async (url) => {
    if (!sampleMap.has(url)) throw new Error(`unexpected url ${url}`);
    return { ok: true, json: async () => sampleMap.get(url) };
  });

  const snapshot = await buildSnapshot();
  assert.strictEqual(snapshot.teams.length, 2);
  assert.strictEqual(snapshot.teams[0].rating, ratingFromStats(snapshot.teams[0]));
  const games = snapshot.sources.find((s) => s.name === "NBA schedule");
  assert.strictEqual(games.status, "ok");
  assert.strictEqual(games.games, 2, "schedule coverage exposed as game count");
  assert.strictEqual(snapshot.warning, null);
});

test("writeSnapshot: writes latest plus dated history file", async () => {
  const dir = path.join(os.tmpdir(), "nba-lab-snapshot-test");
  const snapshot = { generatedAt: "2026-03-05T12:00:00.000Z", teams: [{ name: "X", rating: 80 }], sources: [], injuries: [], warning: null };
  await writeSnapshot(snapshot, dir);

  const latest = JSON.parse(readFileSync(path.join(dir, "snapshot.json"), "utf-8"));
  assert.strictEqual(latest.teams[0].rating, 80);
  const dated = JSON.parse(readFileSync(path.join(dir, "history", "2026-03-05.json"), "utf-8"));
  assert.strictEqual(dated.generatedAt, "2026-03-05T12:00:00.000Z");
});

test("committed data/snapshot.json: valid, complete, and in-range", () => {
  const j = JSON.parse(readFileSync(new URL("../data/snapshot.json", import.meta.url), "utf-8"));
  assert.ok(new Date(j.generatedAt).getTime() > 0, "generatedAt must be a valid date");
  assert.strictEqual(j.teams.length, 30);
  const names = new Set(j.teams.map((t) => t.name));
  assert.strictEqual(names.size, 30, "team names must be unique");
  for (const t of j.teams) {
    assert.ok(t.rating >= 55 && t.rating <= 100, `${t.name} rating out of range`);
    assert.strictEqual(t.wins + t.losses, 82, `${t.name} record must sum to 82`);
  }
});
