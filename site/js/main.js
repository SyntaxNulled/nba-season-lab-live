import { TEAMS } from "./baseline.js";
import { simulate } from "./runner.js";
import { loadSnapshot } from "./loader.js";
import { $, $$ } from "./ui.js";
import * as ui from "./ui.js";
import { BATCH_SIZE } from "./sim.worker.js";

let teams = TEAMS.map((t) => ({ ...t }));
let filter = "All";
let last = [];
let worker = null;
let runToken = 0;

function readConfig() {
  return {
    teams,
    sims: +$("#sims").value,
    homeAdvantage: +$("#home").value,
    volatilityIndex: +$("#vol").value,
    playin: $("#playin").checked,
    seed: 1,
    converge: true,
    batchSize: BATCH_SIZE
  };
}

function applyResult(out, token) {
  if (token !== runToken) return;
  last = out.results;
  ui.updateMetrics(out);
  ui.renderResults(last, $("#search").value);

  const toast = $("#toast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function run() {
  const config = readConfig();
  const token = ++runToken;

  if (typeof Worker !== "undefined") {
    try {
      if (!worker) {
        worker = new Worker(new URL("./sim.worker.js", import.meta.url), { type: "module" });
        worker.onmessage = (e) => {
          if (e.data?.type === "result" && e.data.result) applyResult(e.data.result, token);
        };
        worker.onerror = () => {
          // Worker unavailable/failed -> fall back to main-thread simulation.
          if (token === runToken) applyResult(simulate(config), token);
        };
      }
      worker.postMessage({ config });
      return;
    } catch (err) {
      // Fall through to direct simulation.
    }
  }
  applyResult(simulate(config), token);
}

function resetRatings() {
  teams.forEach((t) => {
    t.rating = t.base;
  });
  ui.renderControls(teams, filter);
}

async function init() {
  const snapshot = await loadSnapshot();
  teams = snapshot.teams;

  if (snapshot.source === "snapshot") {
    ui.setLiveStatus(
      `● Snapshot · ${snapshot.matched} teams · ${new Date(snapshot.generatedAt).toLocaleTimeString()}`,
      true
    );
    ui.renderHealth(snapshot.sources);
  } else {
    ui.setLiveStatus("● Offline baseline", false);
    ui.renderHealth([]);
  }

  ui.renderControls(teams, filter);
  run();
}

// --- wiring ---------------------------------------------------------------

$("#run").onclick = run;

$("#reset").onclick = () => {
  resetRatings();
  $("#home").value = 3;
  $("#vol").value = 1;
  $("#playin").checked = true;
  $("#homeVal").textContent = "+3.0";
  $("#volVal").textContent = "Medium";
  run();
};

$("#resetRatings").onclick = () => {
  resetRatings();
  run();
};

$("#home").oninput = (e) => {
  $("#homeVal").textContent = "+" + (+e.target.value).toFixed(1);
};

$("#vol").oninput = (e) => {
  const labels = ["High", "Medium", "Low"];
  $("#volVal").textContent = labels[+e.target.value];
};

$$(".tab").forEach((b) => {
  b.onclick = () => {
    $$(".tab").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    filter = b.dataset.conf;
    ui.renderControls(teams, filter);
  };
});

$("#search").oninput = () => {
  ui.renderResults(last, $("#search").value);
};

$$('[data-target]').forEach((b) => {
  b.onclick = () => {
    document.getElementById(b.dataset.target).scrollIntoView({ behavior: "smooth" });
  };
});

init();
