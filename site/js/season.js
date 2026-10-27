const GAMES_PER_SEASON = 82;
const BASELINE_RATING = 78;
const SLOPE_DIVISOR = 75;
const WIN_PROB_FLOOR = 0.12;
const WIN_PROB_CEIL = 0.88;

/**
 * Simulate one regular season for a team.
 *
 * Each of the 82 games is an independent Bernoulli draw with win probability
 * derived from the team's strength rating. Returns simulated win count.
 *
 * @param {Object} team
 * @param {Function} rng - PRNG function returning floats in [0, 1)
 */
export function sampleWins(team, rng = Math.random) {
  const p = 0.5 + (team.rating - BASELINE_RATING) / SLOPE_DIVISOR;
  const clamped = Math.max(WIN_PROB_FLOOR, Math.min(WIN_PROB_CEIL, p));
  let wins = 0;
  for (let i = 0; i < GAMES_PER_SEASON; i++) {
    if (rng() < clamped) wins++;
  }
  return wins;
}

export { GAMES_PER_SEASON };
