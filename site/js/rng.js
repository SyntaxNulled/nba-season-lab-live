/**
 * Deterministic seeded PRNG (mulberry32 variant).
 *
 * Returns a function compatible with Math.random() (returns floats in [0,1)).
 * Using it makes Monte Carlo runs reproducible for a given seed, so the same
 * inputs produce the same forecast — required for trustworthy reporting and
 * shareability of a simulation run.
 */
export function createRng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return r;
  };
  return next;
}
