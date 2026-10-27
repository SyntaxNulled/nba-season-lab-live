import { test, assert } from "node:test";
import { readFileSync, existsSync } from "node:fs";

const SITE_JS = new URL("../site/js/", import.meta.url);
const read = (p) => readFileSync(new URL(p, SITE_JS), "utf-8");

const MODULES = [
  "baseline.js",
  "loader.js",
  "main.js",
  "model.js",
  "playoffs.js",
  "runner.js",
  "season.js",
  "ui.js"
];

test("main.js imports $ and $$ it uses (regression: ReferenceError on live site)", () => {
  const src = read("main.js");
  const usesDollarSelectors = /\$\(/.test(src) || /\$\$\(/.test(src);
  const importsDollar = /import\s*\{[^}]*\$\s*[,}][^}]*\}\s*from\s*["']\.\/ui\.js["']/.test(src);
  assert.ok(usesDollarSelectors, "main.js is expected to use $ selectors");
  assert.ok(importsDollar, "main.js must import $ (and $$) from ui.js");
});

test("every relative import in site modules resolves to an existing file", () => {
  for (const f of MODULES) {
    const src = read(f);
    const specs = [...src.matchAll(/from\s*["'](\.[^"']+)["']/g)].map((m) => m[1]);
    for (const s of specs) {
      const target = new URL(s, SITE_JS);
      assert.ok(existsSync(target), `${f} imports "${s}" which must exist`);
    }
  }
});

test("server.js and pipeline scripts import only existing local files", () => {
  const root = new URL("../", import.meta.url);
  const files = ["server.js", "scripts/build-snapshot.mjs"];
  for (const f of files) {
    const src = readFileSync(new URL(f, root), "utf-8");
    const specs = [...src.matchAll(/from\s*["'](\.[^"']+)["']/g)].map((m) => m[1]);
    for (const s of specs) {
      const target = new URL(s, new URL(f, root));
      assert.ok(existsSync(target), `${f} imports "${s}" which must exist`);
    }
  }
});

test("index.html references its script and stylesheet", () => {
  const html = readFileSync(new URL("../site/index.html", import.meta.url), "utf-8");
  assert.ok(/<script[^>]+type="module"[^>]+src="js\/main\.js"/.test(html), "module entry point wired");
  assert.ok(/<link[^>]+href="styles\.css"/.test(html), "stylesheet wired");
});
