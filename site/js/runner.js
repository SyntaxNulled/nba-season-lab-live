import { playoffField, bracket, series } from "./playoffs.js";
import { VOLATILITY_PRESETS } from "./baseline.js";
import { wilsonCI } from "./stats.js";

const FINALS_HOME_ADVANTAGE_SHARE = 0.45;

/**
 * Run the Monte Carlo simulation.
 *
 * @param {Object} config
 * @param {Array} config.teams - team objects (must carry id, conf, rating)
 * @param {number} config.sims - number of seasons to simulate
 * @param {number} config.homeAdvantage - rating points for home court
 * @param {number} config.volatilityIndex - 0=High, 1=Medium, 2=Low
 * @param {boolean} config.playin - include play-in tournament
 * @param {Function} config.rng - PRNG function returning floats in [0, 1)
 * @returns {Object} { results, top, finalist, dark, confidence, sims }
 */
export function simulate({
  teams,
  sims,
  homeAdvantage,
  volatilityIndex,
  playin = true,
  rng = Math.random
}) {
  const vol = VOLATILITY_PRESETS[volatilityIndex].value;
  const counts = new Map(teams.map((t) => [t.id, { t, po: 0, fin: 0, title: 0 }]));
  const bump = (id, key) => {
    const slot = counts.get(id);
    if (slot) slot[key]++;
  };

  for (let i = 0; i < sims; i++) {
    const east = playoffField("East", teams, playin, rng);
    const west = playoffField("West", teams, playin, rng);

    [...east, ...west].forEach((t) => bump(t.id, "po"));

    const eastChampion = bracket(east, homeAdvantage, vol, rng);
    const westChampion = bracket(west, homeAdvantage, vol, rng);

    bump(eastChampion.id, "fin");
    bump(westChampion.id, "fin");

    const champion = series(eastChampion, westChampion, homeAdvantage * FINALS_HOME_ADVANTAGE_SHARE, vol, rng);
    bump(champion.id, "title");
  }

  const results = [...counts.values()]
    .map((x) => {
      const titleCi = wilsonCI(x.title, sims);
      const poCi = wilsonCI(x.po, sims);
      const finCi = wilsonCI(x.fin, sims);
      return {
        t: x.t,
        po: (x.po / sims) * 100,
        fin: (x.fin / sims) * 100,
        title: (x.title / sims) * 100,
        titleLo: titleCi.lo,
        titleHi: titleCi.hi,
        poLo: poCi.lo,
        poHi: poCi.hi,
        finLo: finCi.lo,
        finHi: finCi.hi
      };
    })
    .sort((a, b) => b.title - a.title);

  const top = results[0];
  const finalist = [...results].sort((a, b) => b.fin - a.fin)[0];
  const dark = results.slice(8).sort((a, b) => b.title - a.title)[0];

  const top4Share = results.slice(0, 4).reduce((s, x) => s + x.title, 0);
  const confidence = top4Share > 65 ? "High" : top4Share > 45 ? "Medium" : "Wide open";

  return { results, top, finalist, dark, confidence, sims };
}
