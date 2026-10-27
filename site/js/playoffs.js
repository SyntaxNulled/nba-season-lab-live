import { sampleWins } from "./season.js";
import { logistic } from "./model.js";

const SERIES_WINS_NEEDED = 4;
// Home/away pattern for a best-of-7 (2-2-1-1-1) where the first-listed
// team hosts games 1, 2, 5 and 7.
const HOME_PATTERN = [1, 1, -1, -1, 1, -1, 1];
const PLAYIN_HOME_ADVANTAGE = 1.5;
const PLAYIN_VOLATILITY = 1.35;

/**
 * Simulate one best-of-seven playoff series between two teams.
 *
 * @param {Object} a - team A
 * @param {Object} b - team B
 * @param {number} home - rating-point advantage for team A when pattern[g] === 1
 * @param {number} vol - volatility scale
 * @param {Function} rng - PRNG function returning floats in [0, 1)
 * @returns {Object} winning team
 */
export function series(a, b, home = 0, vol = 1, rng = Math.random) {
  let wa = 0;
  let wb = 0;
  for (let g = 0; wa < SERIES_WINS_NEEDED && wb < SERIES_WINS_NEEDED; g++) {
    const p = logistic(a.rating, b.rating, HOME_PATTERN[g] * home, vol);
    if (rng() < p) {
      wa++;
    } else {
      wb++;
    }
  }
  return wa === SERIES_WINS_NEEDED ? a : b;
}

/**
 * Build one conference's playoff field from simulated regular-season wins.
 *
 * @param {string} conf - "East" | "West"
 * @param {Array} teams - full team list
 * @param {boolean} withPlayin - include the play-in tournament
 * @param {Function} rng - PRNG function returning floats in [0, 1)
 * @returns {Array} playoff field: top 6 + play-in winners as seeds 7/8
 */
export function playoffField(conf, teams, withPlayin = true, rng = Math.random) {
  const arr = teams
    .filter((t) => t.conf === conf)
    .map((t) => ({ t, w: sampleWins(t, rng) + rng() }))
    .sort((a, b) => b.w - a.w);

  if (!withPlayin) {
    return arr.slice(0, 8).map((x) => x.t);
  }

  const g78 = series(arr[6].t, arr[7].t, PLAYIN_HOME_ADVANTAGE, PLAYIN_VOLATILITY, rng);
  const g910 = series(arr[8].t, arr[9].t, PLAYIN_HOME_ADVANTAGE, PLAYIN_VOLATILITY, rng);
  const loser78 = g78 === arr[6].t ? arr[7].t : arr[6].t;
  const last = series(loser78, g910, PLAYIN_HOME_ADVANTAGE, PLAYIN_VOLATILITY, rng);

  return [...arr.slice(0, 6).map((x) => x.t), g78, last];
}

/**
 * Simulate one conference's bracket to a champion.
 *
 * @param {Array} seed - playoff field ordered by seed (index 0 = best)
 * @param {number} home - home-court rating advantage
 * @param {number} vol - volatility scale
 * @param {Function} rng - PRNG function returning floats in [0, 1)
 * @returns {Object} conference champion
 */
export function bracket(seed, home = 0, vol = 1, rng = Math.random) {
  const quarters = [
    series(seed[0], seed[7], home, vol, rng),
    series(seed[3], seed[4], home, vol, rng),
    series(seed[2], seed[5], home, vol, rng),
    series(seed[1], seed[6], home, vol, rng)
  ];
  const semis = [series(quarters[0], quarters[1], home, vol, rng), series(quarters[3], quarters[2], home, vol, rng)];
  return series(semis[0], semis[1], home, vol, rng);
}
