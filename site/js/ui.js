export function $(s) {
  return document.querySelector(s);
}
export function $$(s) {
  return [...document.querySelectorAll(s)];
}

export function renderControls(teams, filter, onChange) {
  const box = $("#teamControls");
  box.innerHTML = "";
  teams
    .filter((t) => filter === "All" || t.conf === filter)
    .forEach((t) => {
      const d = document.createElement("div");
      d.className = "team-control";
      d.innerHTML = `
        <div>
          <span>${t.name}</span>
          <span class="rating">${t.rating}</span>
        </div>
        <input type="range" min="55" max="100" value="${t.rating}"
          data-id="${t.id}" aria-label="${t.name} strength">
      `;
      box.appendChild(d);
    });

  $$(".team-control input").forEach((x) => {
    x.oninput = (e) => {
      const t = teams[+e.target.dataset.id];
      t.rating = +e.target.value;
      e.target.previousElementSibling.querySelector(".rating").textContent = t.rating;
      if (onChange) onChange(t);
    };
  });
}

export function renderResults(results, search = "") {
  const q = search.toLowerCase();
  const box = $("#results");
  box.innerHTML = "";

  const filtered = results.filter((x) => x.t.name.toLowerCase().includes(q));
  if (filtered.length === 0) {
    box.innerHTML = '<div class="empty">No matching teams.</div>';
    return;
  }

  filtered.forEach((x, i) => {
    const d = document.createElement("div");
    d.className = "result-row";
    d.innerHTML = `
      <div>
        <div class="team-name">
          <span class="rank">${i + 1}</span>
          <i class="dot" style="--team: ${x.t.color}"></i>
          ${x.t.name}
        </div>
        <div class="bar"><i style="width: ${Math.min(100, x.title * 3)}%"></i></div>
      </div>
      <span>${x.po.toFixed(1)}%</span>
      <span>${x.fin.toFixed(1)}%</span>
      <span class="pct-title">${x.title.toFixed(1)}% ± ${(((x.titleHi - x.titleLo) / 2) * 100).toFixed(1)}%</span>
    `;
    box.appendChild(d);
  });
}

export function updateMetrics({ top, finalist, dark, confidence }) {
  const halfWidth = (ci) => ((ci.hi - ci.lo) / 2) * 100;
  $("#fav").textContent = top.t.name;
  $("#favPct").textContent = `${top.title.toFixed(1)}% ± ${halfWidth(top).toFixed(1)}% title odds`;
  $("#finalist").textContent = finalist.t.name;
  $("#finalPct").textContent = `${finalist.fin.toFixed(1)}% ± ${halfWidth(finalist).toFixed(1)}% Finals odds`;
  $("#dark").textContent = dark.t.name;
  $("#darkPct").textContent = `${dark.title.toFixed(1)}% ± ${halfWidth(dark).toFixed(1)}% title odds`;
  $("#confidence").textContent = confidence;
}

export function setLiveStatus(text, online = false) {
  const el = $("#liveStatus");
  el.textContent = text;
  el.className = "live-status" + (online ? " online" : "");
}

export function renderHealth(sources) {
  const container = $("#sourceHealth");
  if (!sources || sources.length === 0) {
    container.innerHTML =
      '<h3>Live source health</h3><p>No live sources available. Local editable ratings remain active.</p>';
    return;
  }
  container.innerHTML = `
    <h3>Live source health</h3>
    ${sources
      .map(
        (x) => `
      <div>
        <span>${x.name}</span>
        <b class="${x.status}">${x.status}</b>
        <small>${x.latencyMs} ms · ${new Date(x.updatedAt).toLocaleString()}</small>
      </div>
    `
      )
      .join("")}
  `;
}
