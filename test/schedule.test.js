import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateSchedule } from "../site/js/schedule.js";
import { createRng } from "../site/js/rng.js";
import { simulate } from "../site/js/runner.js";
import { TEAMS } from "../site/js/baseline.js";

const teams = [
  { id: 15, name: "Thunder", conf: "West", rating: 96, base: 96 },
  { id: 16, name: "Nuggets", conf: "West", rating: 92, base: 92 }
];

test("schedule: deterministic home win when rng below home win probability", () => {
  const wins = simulateSchedule([{ home: 15, away: 16 }], teams, 3, 1, () => 0);
  assert.strictEqual(wins.get(15), 1);
  assert.strictEqual(wins.get(16), 0);
});

test("schedule: away win when rng above home win probability", () => {
  const wins = simulateSchedule([{ home: 15, away: 16 }], teams, 3, 1, () => 0.999);
  assert.strictEqual(wins.get(16), 1);
});

test("schedule: unknown team ids are skipped", () => {
  const small = [{ id: 1, name: "A", conf: "East", rating: 80, base: 80 }];
  const wins = simulateSchedule([{ home: 99, away: 1 }], small, 0, 1, () => 0);
  assert.strictEqual(wins.get(1), 0);
});

test("runner: schedule-driven season produces deterministic results", () => {
  const cfg = { teams: TEAMS, sims: 10, homeAdvantage: 3, volatilityIndex: 1, playin: true, games: [{ home: 15, away: 16 }] };
  const a = simulate({ ...cfg, rng: createRng(42) });
  const b = simulate({ ...cfg, rng: createRng(42) });
  assert.deepStrictEqual(a.results, b.results);
});
