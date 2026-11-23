import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBars } from "../site/js/ui.js";

function result(name, title) {
  return { t: { id: 1, name: name, conf: "East", rating: 80, base: 80 }, po: 50, fin: 40, title, titleLo: 0.1, titleHi: 0.9 };
}

test("buildBars: returns top n results sorted by title odds desc", () => {
  const bars = buildBars([result("Celtics", 22.5), result("Thunder", 18.2), result("Nuggets", 12.0)], 2);
  assert.strictEqual(bars.length, 2);
  assert.strictEqual(bars[0].name, "Celtics");
  assert.strictEqual(bars[0].pct, 22.5);
  assert.strictEqual(bars[1].name, "Thunder");
});

test("buildBars: defaults to top 10", () => {
  const results = Array.from({ length: 15 }, (_, i) => result(`T${i}`, (15 - i) * 3));
  const bars = buildBars(results);
  assert.strictEqual(bars.length, 10);
  assert.strictEqual(bars[0].name, "T0");
});

test("buildBars: handles empty results", () => {
  assert.deepStrictEqual(buildBars([], 10), []);
});
