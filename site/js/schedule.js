import { logistic } from "./model.js";

/**
 * Simulate the regular-season win totals implied by a concrete game schedule.
 *
 * Unlike the default Bernoulli slate (each team playing 82 average-strength
 * games), this runs the actual matchups: for every game, the win probability
 * comes from the rating difference plus home-court advantage, then one rng
 * draw decides the outcome.
 *
 * @param {Array} games - schedule of games: { home: teamId, away: teamId }
 * @param {Array} teams - full team list
 * @param {number} homeAdvantage - rating-point advantage for the home team
 * @param {number} vol - volatility scale
 * @param {Function} rng - PRNG function returning floats in [0, 1)
 * @returns {Map<number, number>} teamId -> simulated wins
 */
export function simulateSchedule(games, teams, homeAdvantage, vol, rng = Math.random) {
  const wins = new Map(teams.map((t) => [t.id, 0]));
  for (const g of games || []) {
    const a = teams.find((t) => t.id === g.home);
    const b = teams.find((t) => t.id === g.away);
    if (!a || !b) continue;
    const p = logistic(a.rating, b.rating, homeAdvantage, vol);
    if (rng() < p) {
      wins.set(a.id, wins.get(a.id) + 1);
    } else {
      wins.set(b.id, wins.get(b.id) + 1);
    }
  }
  return wins;
}
