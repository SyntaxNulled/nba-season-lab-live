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
 * `home` is the rating-point advantage given to team A when pattern[g] === 1
 * (and to team B when pattern[g] === -1). Returns the winning team object.
 */
export function series(a, b, home = 0, vol = 1) {
  let wa = 0;
  let wb = 0;
  for (let g = 0; wa < SERIES_WINS_NEEDED && wb < SERIES_WINS_NEEDED; g++) {
    const p = logistic(a.rating, b.rating, HOME_PATTERN[g] * home, vol);
    if (Math.random() < p) {
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
 * Teams are seeded by simulated wins plus a small random jitter so that
 * near-tied teams can swap seeds. When `withPlayin` is true, seeds 7-10 play
 * the play-in tournament to determine seeds 7 and 8.
 */
export function playoffField(conf, teams, withPlayin = true) {
  const arr = teams
    .filter((t) => t.conf === conf)
    .map((t) => ({ t, w: sampleWins(t) + Math.random() }))
    .sort((a, b) => b.w - a.w);

  if (!withPlayin) {
    return arr.slice(0, 8).map((x) => x.t);
  }

  const g78 = series(arr[6].t, arr[7].t, PLAYIN_HOME_ADVANTAGE, PLAYIN_VOLATILITY);
  const g910 = series(arr[8].t, arr[9].t, PLAYIN_HOME_ADVANTAGE, PLAYIN_VOLATILITY);
  const loser78 = g78 === arr[6].t ? arr[7].t : arr[6].t;
  const last = series(loser78, g910, PLAYIN_HOME_ADVANTAGE, PLAYIN_VOLATILITY);

  return [...arr.slice(0, 6).map((x) => x.t), g78, last];
}

/**
 * Simulate one conference's bracket to a champion.
 *
 * Seeds are matched 1v8, 4v5, 2v7, 3v6 in the first round, then reseeded
 * conventionally through the conference finals.
 */
export function bracket(seed, home = 0, vol = 1) {
  const quarters = [
    series(seed[0], seed[7], home, vol),
    series(seed[3], seed[4], home, vol),
    series(seed[2], seed[5], home, vol),
    series(seed[1], seed[6], home, vol)
  ];
  const semis = [series(quarters[0], quarters[1], home, vol), series(quarters[3], quarters[2], home, vol)];
  return series(semis[0], semis[1], home, vol);
}
