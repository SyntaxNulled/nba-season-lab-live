import { test } from "node:test";
import assert from "node:assert/strict";
import { logistic } from "../site/js/model.js";
import { series, bracket, playoffField } from "../site/js/playoffs.js";
import { simulate } from "../site/js/runner.js";
import { TEAMS, VOLATILITY_PRESETS } from "../site/js/baseline.js";
import { createRng } from "../site/js/rng.js";
import { wilsonCI } from "../site/js/stats.js";

const originalRandom = Math.random;

function withRandom(value, fn) {
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

const a = { id: 1, name: "Team A", conf: "East", rating: 100, base: 100 };
const b = { id: 2, name: "Team B", conf: "East", rating: 55, base: 55 };

test("logistic: equal ratings are a coin flip", () => {
  assert.strictEqual(logistic(80, 80), 0.5);
});

test("logistic: home advantage shifts probability toward the home team", () => {
  assert.ok(logistic(80, 80, 3) > 0.5);
  assert.ok(logistic(80, 80, -3) < 0.5);
});

test("logistic: extreme ratings stay inside (0, 1)", () => {
  const strong = logistic(100, 55);
  const weak = logistic(55, 100);
  assert.ok(strong > 0.9 && strong < 1);
  assert.ok(weak > 0 && weak < 0.1);
});

test("logistic: higher volatility flattens the curve toward 0.5", () => {
  const tight = logistic(96, 67, 0, 1);
  const loose = logistic(96, 67, 0, 2);
  assert.ok(loose < tight);
  assert.ok(loose > 0.5);
});

test("series: always returns one of the two teams", () => {
  const winner = withRandom(0.3, () => series(a, b));
  assert.ok(winner === a || winner === b);
});

test("series: with RNG fixed at 0 the higher-rated team sweeps", () => {
  const winner = withRandom(0, () => series(a, b, 0, 1));
  assert.strictEqual(winner, a);
});

test("series: best-of-seven never needs more than 7 games", () => {
  let games = 0;
  const origRandom = Math.random;
  Math.random = () => {
    games++;
    return 0.5;
  };
  try {
    series({ ...a, rating: 80 }, { ...b, rating: 80 });
  } finally {
    Math.random = origRandom;
  }
  assert.ok(games <= 7);
});

test("bracket: deterministic RNG at 0 returns the top seed", () => {
  const seeds = TEAMS.filter((t) => t.conf === "East").slice(0, 8);
  const champion = withRandom(0, () => bracket(seeds, 3, 1));
  assert.strictEqual(champion, seeds[0]);
});

test("playoffField: returns 8 teams without play-in", () => {
  const field = withRandom(0.2, () => playoffField("East", TEAMS, false));
  assert.strictEqual(field.length, 8);
});

test("playoffField: play-in also returns 8 teams", () => {
  const field = withRandom(0.2, () => playoffField("East", TEAMS, true));
  assert.strictEqual(field.length, 8);
});

test("simulate: returns one result per team", () => {
  const out = simulate({ teams: TEAMS, sims: 100, homeAdvantage: 3, volatilityIndex: 1, playin: true });
  assert.strictEqual(out.results.length, TEAMS.length);
});

test("simulate: title odds sum to 100%", () => {
  const out = withRandom(0.5, () =>
    simulate({ teams: TEAMS, sims: 100, homeAdvantage: 3, volatilityIndex: 1, playin: true })
  );
  const sum = out.results.reduce((acc, x) => acc + x.title, 0);
  assert.ok(Math.abs(sum - 100) < 1e-6);
});

test("simulate: all frequencies stay within [0, 100]", () => {
  const out = simulate({ teams: TEAMS, sims: 50, homeAdvantage: 3, volatilityIndex: 1, playin: true });
  for (const x of out.results) {
    assert.ok(x.po >= 0 && x.po <= 100, `${x.t.name} po out of range`);
    assert.ok(x.fin >= 0 && x.fin <= 100, `${x.t.name} fin out of range`);
    assert.ok(x.title >= 0 && x.title <= 100, `${x.t.name} title out of range`);
  }
});

test("playoffField: play-in fills seeds 7 and 8 in the right order", () => {
  // RNG fixed at 0.2: every simulated win total ties at 82, so the stable sort
  // preserves id order and every play-in game is won by the first-listed
  // (higher-seeded) team — seeds 7 and 8 must be the 7v8 winner and the
  // 9/10-vs-7-or-8 survivor respectively.
  const field = withRandom(0.2, () => playoffField("East", TEAMS, true));
  assert.strictEqual(field[6].name, TEAMS[6].name, "seed 7 is the 7v8 play-in winner");
  assert.strictEqual(field[7].name, TEAMS[7].name, "seed 8 comes from the second play-in game");
});

test("series: home advantage decides evenly-matched series deterministically", () => {
  const even = { id: 3, name: "Even", conf: "East", rating: 80, base: 80 };
  const even2 = { id: 4, name: "Even 2", conf: "East", rating: 80, base: 80 };

  // rng 0.42: p(home=+6) ≈ 0.646 > 0.42 → A wins; p(home=-6) ≈ 0.354 < 0.42 → B wins
  const withHome = withRandom(0.42, () => series(even, even2, 6, 1));
  const against = withRandom(0.42, () => series(even, even2, -6, 1));
  assert.strictEqual(withHome, even);
  assert.strictEqual(against, even2);
});

test("runner: volatility presets map to the documented values", () => {
  assert.strictEqual(VOLATILITY_PRESETS[0].label, "High");
  assert.strictEqual(VOLATILITY_PRESETS[1].label, "Medium");
  assert.strictEqual(VOLATILITY_PRESETS[2].label, "Low");
  assert.ok(VOLATILITY_PRESETS[0].value > VOLATILITY_PRESETS[1].value);
  assert.ok(VOLATILITY_PRESETS[1].value > VOLATILITY_PRESETS[2].value);
});

test("rng: createRng produces deterministic float sequences", () => {
  const a = createRng(42);
  const b = createRng(42);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepStrictEqual(seqA, seqB);
  const seqC = [createRng(7)(), createRng(7)(), createRng(7)()];
  assert.notDeepStrictEqual(seqA, seqC);
});

test("runner: same seed produces identical deterministic results", () => {
  const cfg = { teams: TEAMS, sims: 100, homeAdvantage: 3, volatilityIndex: 1, playin: true };
  const a = simulate({ ...cfg, rng: createRng(42) });
  const b = simulate({ ...cfg, rng: createRng(42) });
  assert.deepStrictEqual(a.results, b.results);
});

test("runner: wilson CIs bound probabilities and satisfy lo <= p <= hi", () => {
  const out = simulate({ teams: TEAMS, sims: 200, homeAdvantage: 3, volatilityIndex: 1, playin: true, rng: createRng(7) });
  for (const x of out.results) {
    const tFrac = x.title / 100;
    const poFrac = x.po / 100;
    const finFrac = x.fin / 100;
    assert.ok(x.titleLo <= tFrac && tFrac <= x.titleHi);
    assert.ok(x.poLo <= poFrac && poFrac <= x.poHi);
    assert.ok(x.finLo <= finFrac && finFrac <= x.finHi);
    assert.ok(x.titleLo >= 0);
    assert.ok(x.titleHi >= x.titleLo);
  }
});

test("wilsonCI: returns ordered bounds that contain the estimate", () => {
  const cases = [
    { success: 0, total: 10 },
    { success: 3, total: 10 },
    { success: 7, total: 10 },
    { success: 10, total: 10 }
  ];
  for (const c of cases) {
    const { lo, hi } = wilsonCI(c.success, c.total);
    assert.ok(hi >= lo, "hi >= lo");
    assert.ok(lo >= 0, "lo >= 0");
    assert.ok(lo <= c.success / c.total && c.success / c.total <= hi, "contains estimate");
  }
});
