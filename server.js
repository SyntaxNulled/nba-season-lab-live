import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshot } from "./scripts/build-snapshot.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(root, "site");
const dataRoot = path.join(root, "data");
const port = process.env.PORT || 3000;
const CACHE_MS = 5 * 60 * 1000;

const cache = { at: 0, data: null };

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

async function snapshotHandler() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  const data = await buildSnapshot();
  cache = { at: Date.now(), data };
  return data;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/snapshot") {
      res.setHeader("content-type", "application/json");
      res.setHeader("cache-control", "public, max-age=60");
      return res.end(JSON.stringify(await snapshotHandler()));
    }

    if (req.url === "/api/health") {
      return res.end(
        JSON.stringify({
          ok: true,
          cacheAgeSec: cache.at ? Math.round((Date.now() - cache.at) / 1000) : null
        })
      );
    }

    if (req.url.startsWith("/data/")) {
      const file = path.join(dataRoot, path.normalize(req.url.slice(1)));
      if (!file.startsWith(dataRoot)) throw new Error("invalid path");
      res.setHeader("content-type", mime[path.extname(file)] || "application/octet-stream");
      return res.end(await fs.readFile(file));
    }

    const url = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const file = path.join(siteRoot, path.normalize(url).replace(/^\.\.(\/|\\|$)/, ""));
    if (!file.startsWith(siteRoot)) throw new Error("invalid path");
    res.setHeader("content-type", mime[path.extname(file)] || "application/octet-stream");
    res.end(await fs.readFile(file));
  } catch (e) {
    res.statusCode = e.code === "ENOENT" ? 404 : 500;
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(port, () => {
  console.log(`NBA Season Lab live on http://localhost:${port}`);
});
