/**
 * Wilson score interval for a binomial proportion.
 *
 * Conservative two-sided interval; used to bound Monte Carlo estimates with
 * their sampling error (n = number of simulated seasons).
 *
 * @param {number} success - observed successes (in units of 1, i.e. count)
 * @param {number} total - trials (in units of 1, i.e. count)
 * @param {number} z - z-score, default 1.96 (~95% confidence)
 * @returns {{lo: number, hi: number}} interval bounds in [0, 1]
 */
export function wilsonCI(success, total, z = 1.96) {
  const n = total;
  const p = n > 0 ? success / n : 0;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const halfWidth = (z / denom) * Math.sqrt((p * (1 - p)) / n + (z2) / (4 * n * n));
  const lo = Math.max(0, centre - halfWidth);
  const hi = Math.min(1, centre + halfWidth);
  return { lo, hi };
}
