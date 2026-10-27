import { TEAMS } from "./baseline.js";

const SNAPSHOT_PATH = "./data/snapshot.json";

/**
 * Load the team-strength snapshot.
 *
 * Tries the committed data/snapshot.json first (GitHub Pages deployment).
 * Falls back to the editable local baseline if the file is missing or the
 * network fails. Returns a clean team list plus provenance metadata.
 */
export async function loadSnapshot() {
  const teams = TEAMS.map((t) => ({ ...t }));
  let source = "baseline";
  let generatedAt = null;
  let sources = [];
  let matched = 0;

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
      }
    }
  } catch (_err) {
    // Network or file unavailable — keep the editable baseline.
  }

  return { teams, source, matched, generatedAt, sources };
}
