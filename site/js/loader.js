import { TEAMS } from "./baseline.js";
import { fetchLiveEspn } from "./live.js";
import { ratingFromStats } from "./teams.js";

const SNAPSHOT_PATH = "./data/snapshot.json";

/**
 * Load the team-strength snapshot.
 *
 * Hybrid strategy: the committed data/snapshot.json (written by the GitHub
 * Actions snapshot workflow) is primary; if it is missing we fall back to the
 * editable local baseline. We then attempt a client-direct refresh from live
 * ESPN standings and apply it when the browser-side request succeeds.
 *
 * Returns a clean team list plus provenance metadata.
 */
export async function loadSnapshot() {
  const teams = TEAMS.map((t) => ({ ...t }));
  let source = "baseline";
  let generatedAt = null;
  let sources = [];
  let matched = 0;
  let games = null;

  try {
    const res = await fetch(SNAPSHOT_PATH, { cache: "no-cache" });
    if (res.ok) {
      const j = await res.json();
      // Merge in place: unknown teams keep their baseline ratings so the
      // simulator always has 15 East + 15 West teams even with a partial feed.
      for (const x of j.teams || []) {
        const t = teams.find((b) => b.name === x.name);
        if (!t) continue;
        const rating = typeof x.rating === "number" ? x.rating : t.rating;
        t.rating = rating;
        t.base = rating;
        matched++;
      }

      if (matched > 0) {
        source = "snapshot";
        generatedAt = j.generatedAt || null;
        sources = j.sources || [];
        games = Array.isArray(j.games) ? j.games : null;
      }
    }
  } catch (_err) {
    // Network or file unavailable — keep the editable baseline.
  }

  // Client-direct live refresh attempt (snapshot stays primary when it works).
  let liveRows = null;
  try {
    liveRows = await fetchLiveEspn();
  } catch (_err) {
    liveRows = null;
  }

  if (Array.isArray(liveRows) && liveRows.length > 0) {
    for (const row of liveRows) {
      const t = teams.find((b) => b.name === row.name);
      if (!t) continue;
      const rating = typeof row.rating === "number" ? row.rating : ratingFromStats(row);
      t.rating = rating;
      t.base = rating;
      matched++;
    }
    source = "live-espn";
    generatedAt = new Date().toISOString();
  }

  return { teams, source, matched, generatedAt, sources, games, live: liveRows };
}
