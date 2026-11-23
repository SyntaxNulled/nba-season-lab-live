import { espnParse } from "./teams.js";

const ESPN_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?region=us&lang=en&contentorigin=espn&type=0&level=2";

/**
 * Client-direct refresh attempt: pull live NBA standings straight from the
 * browser (CORS permitting). Returns normalized standings rows, or null when
 * the request fails / returns non-ok / yields no entries.
 *
 * @param {number} timeoutMs - hard request timeout
 * @returns {Promise<Array|null>}
 */
export async function fetchLiveEspn(timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(ESPN_STANDINGS_URL, {
      signal: controller.signal,
      headers: { "user-agent": "NBA-Season-Lab/2.0 (+personal analytics app)", accept: "application/json" }
    });
    if (!r.ok) return null;
    const j = await r.json();
    const rows = espnParse(j);
    return rows.length > 0 ? rows : null;
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
