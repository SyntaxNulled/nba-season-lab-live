import { TEAMS } from "./baseline.js";
import { simulate } from "./runner.js";
import { loadSnapshot } from "./loader.js";
import * as ui from "./ui.js";

let teams = TEAMS.map((t) => ({ ...t }));
let filter = "All";
let last = [];

function readConfig() {
  return {
    teams,
    sims: +$("#sims").value,
    homeAdvantage: +$("#home").value,
    volatilityIndex: +$("#vol").value,
    playin: $("#playin").checked
  };
}

function run() {
  const out = simulate(readConfig());
  last = out.results;
  ui.updateMetrics(out);
  ui.renderResults(last, $("#search").value);

  const toast = $("#toast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
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
