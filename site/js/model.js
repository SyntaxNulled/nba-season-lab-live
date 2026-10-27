/**
 * Probability that team A beats team B in a single game.
 *
 * p = 1 / (1 + exp(-((ratingA - ratingB) + home) / (10 * vol)))
 *
 * `home` is added to the home team's rating in rating points.
 * `vol` scales the curve: higher volatility flattens it (closer to a coin flip).
 */
export function logistic(a, b, home = 0, vol = 1) {
  const exponent = -((a - b) + home) / (10 * vol);
  return 1 / (1 + Math.exp(exponent));
}
