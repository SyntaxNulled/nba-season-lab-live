export const TEAM_ALIAS = {
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
