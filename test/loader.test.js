import { test, assert } from "node:test";
import { TEAMS } from "../site/js/baseline.js";
import { loadSnapshot } from "../site/js/loader.js";

test("loader: merges a partial snapshot into the full 30-team roster", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({
      generatedAt: "2026-01-01T00:00:00.000Z",
      teams: [{ name: "Boston Celtics", rating: 95 }],
      sources: [{ name: "ESPN standings", status: "ok", latencyMs: 1, updatedAt: "2026-01-01T00:00:00.000Z" }]
    })
  }));

  const out = await loadSnapshot();
  assert.strictEqual(out.teams.length, 30, "roster must always stay complete");
  assert.strictEqual(out.source, "snapshot");
  assert.strictEqual(out.matched, 1);
  assert.strictEqual(out.teams.find((x) => x.name === "Boston Celtics").rating, 95);
  assert.strictEqual(out.teams.find((x) => x.name === "Utah Jazz").rating, 67, "unmatched teams keep baseline");
  assert.strictEqual(out.sources.length, 1);
});

test("loader: non-ok response falls back to the editable baseline", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 404 }));
  const out = await loadSnapshot();
  assert.strictEqual(out.source, "baseline");
  assert.strictEqual(out.teams.length, 30);
  assert.strictEqual(out.matched, 0);
  assert.strictEqual(out.teams.find((x) => x.name === "Boston Celtics").rating, 91);
});

test("loader: fetch rejection falls back to the editable baseline", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("network down");
  });
  const out = await loadSnapshot();
  assert.strictEqual(out.source, "baseline");
  assert.strictEqual(out.teams.length, 30);
  assert.strictEqual(out.generatedAt, null);
});

test("loader: returns independent team copies, shared module constant untouched", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ teams: [{ name: "Boston Celtics", rating: 95 }] })
  }));

  const out = await loadSnapshot();
  const boston = out.teams.find((x) => x.name === "Boston Celtics");
  boston.rating = 10;
  assert.strictEqual(out.teams.find((x) => x.name === "Boston Celtics").rating, 10);
  assert.strictEqual(TEAMS.find((x) => x.name === "Boston Celtics").rating, 91, "module constant immutable");
});
