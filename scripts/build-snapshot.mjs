import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const TEAM_ALIAS = {
  "LA Clippers": "Los Angeles Clippers",
  "NY Knicks": "New York Knicks",
  "Golden State": "Golden State Warriors",
  "Oklahoma City": "Oklahoma City Thunder",
  "San Antonio": "San Antonio Spurs",
  "New Orleans": "New Orleans Pelicans"
};

export function normalize(name) {
  return TEAM_ALIAS[name] ?? name;
}

/**
 * Fetch JSON with an 8-second hard timeout.
 * Must await inside the try block so clearTimeout only fires after the
 * request has settled — otherwise the AbortController timer is cancelled
 * before it can ever abort the fetch.
 */
async function getJSON(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      headers: {
        "user-agent": "NBA-Season-Lab/2.0 (+personal analytics app)",
        accept: "application/json",
        ...headers
      },
      signal: controller.signal
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export function espnParse(j) {
  const rows = [];
  for (const group of j.children || []) {
    for (const e of group.standings?.entries || []) {
      const stats = Object.fromEntries((e.stats || []).map((s) => [s.name, s.value]));
      const raw = e.team?.displayName;
      rows.push({
        name: normalize(raw),
        wins: Number(stats.wins) || 0,
        losses: Number(stats.losses) || 0,
        winPct: Number(stats.winPercent) || 0,
        pointDiff: Number(stats.pointDifferential) || 0,
        source: "ESPN standings"
      });
    }
  }
  return rows;
}

export function ratingFromStats(t) {
  return Math.max(55, Math.min(100, Math.round(76 + t.winPct * 15 + t.pointDiff * 0.65)));
}

async function source(name, fn) {
  const started = Date.now();
  try {
    const data = await fn();
    return {
      name,
      status: "ok",
      latencyMs: Date.now() - started,
      updatedAt: new Date().toISOString(),
      data
    };
  } catch (e) {
    return {
      name,
      status: "error",
      latencyMs: Date.now() - started,
      updatedAt: new Date().toISOString(),
      error: e.message,
      data: []
    };
  }
}

/**
 * Build a fresh snapshot from upstream sources.
 *
 * ESPN standings drive team records and strength ratings; the NBA CDN schedule
 * feed is used for coverage validation; BallDontLie injuries are optional and
 * require BALLDONTLIE_API_KEY (never sent to the browser).
 */
export async function buildSnapshot() {
  const espnTask = source("ESPN standings", async () =>
    espnParse(
      await getJSON(
        "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?region=us&lang=en&contentorigin=espn&type=0&level=2"
      )
    )
  );
  const scheduleTask = source("NBA schedule", async () => {
    const j = await getJSON("https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json");
    return {
      games: j?.leagueSchedule?.gameDates?.reduce((n, d) => n + (d.games?.length || 0), 0) || 0
    };
  });
  const tasks = [espnTask, scheduleTask];

  if (process.env.BALLDONTLIE_API_KEY) {
    tasks.push(
      source("BALLDONTLIE injuries", async () => {
        const j = await getJSON("https://api.balldontlie.io/v1/injuries?per_page=100", {
          Authorization: process.env.BALLDONTLIE_API_KEY
        });
        return j.data || [];
      })
    );
  }

  const sources = await Promise.all(tasks);
  const standings = sources.find((s) => s.name === "ESPN standings")?.data || [];
  const teams = standings.map((t) => ({
    ...t,
    rating: ratingFromStats(t),
    provenance: ["ESPN standings"]
  }));
  const injuries = sources.find((s) => s.name.includes("injuries"))?.data || [];
  const warning =
    teams.length < 30
      ? "Live standings incomplete; simulator retains its local baseline for unmatched teams."
      : null;

  return {
    generatedAt: new Date().toISOString(),
    cacheSeconds: 300,
    season: "current",
    teams,
    sources: sources.map(({ data, ...s }) => ({
      ...s,
      records: Array.isArray(data) ? data.length : undefined
    })),
    injuries,
    warning
  };
}

/**
 * Write snapshot.json plus a dated copy into data/history/ (for back-testing).
 */
export async function writeSnapshot(snapshot, dir = path.join(process.cwd(), "data")) {
  await mkdir(dir, { recursive: true });
  await mkdir(path.join(dir, "history"), { recursive: true });
  await writeFile(path.join(dir, "snapshot.json"), JSON.stringify(snapshot, null, 2));
  const day = new Date(snapshot.generatedAt).toISOString().slice(0, 10);
  await writeFile(path.join(dir, "history", `${day}.json`), JSON.stringify(snapshot, null, 2));
}

async function main() {
  const snapshot = await buildSnapshot();
  await writeSnapshot(snapshot);
  console.log(
    `snapshot written: ${snapshot.teams.length} teams, generated ${snapshot.generatedAt}`
  );
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
