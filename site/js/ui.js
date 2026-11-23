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

export function buildBars(results, n = 10) {
  return [...(results || [])]
    .sort((a, b) => b.title - a.title)
    .slice(0, n)
    .map((x) => ({ name: x.t.name, pct: x.title }));
}

export function renderChart(el, results, n = 10) {
  const bars = buildBars(results, n);
  el.innerHTML = "";
  const max = bars.length > 0 ? Math.max(...bars.map((b) => b.pct), 0) : 1;
  bars.forEach((b, i) => {
    const row = document.createElement("div");
    row.className = "chart-row";
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.width = `${max > 0 ? (b.pct / max) * 100 : 0}%`;
    row.innerHTML = `
      <span class="chart-rank">${i + 1}</span>
      <span class="chart-name">${b.name}</span>
      <span class="chart-pct">${b.pct.toFixed(1)}%</span>
    `;
    el.appendChild(row);
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
    d.onclick = () => openTeamDrawer(x);
    box.appendChild(d);
  });
}

export function updateMetrics({ top, finalist, dark, confidence }) {
  const topHalf = top ? ((top.titleHi - top.titleLo) / 2) * 100 : 0;
  const finalistHalf = finalist ? ((finalist.finHi - finalist.finLo) / 2) * 100 : 0;
  const darkHalf = dark ? ((dark.titleHi - dark.titleLo) / 2) * 100 : 0;
  $("#fav").textContent = top.t.name;
  $("#favPct").textContent = `${top.title.toFixed(1)}% ± ${topHalf.toFixed(1)}% title odds`;
  $("#finalist").textContent = finalist.t.name;
  $("#finalPct").textContent = `${finalist.fin.toFixed(1)}% ± ${finalistHalf.toFixed(1)}% Finals odds`;
  $("#dark").textContent = dark.t.name;
  $("#darkPct").textContent = `${dark.title.toFixed(1)}% ± ${darkHalf.toFixed(1)}% title odds`;
  $("#confidence").textContent = confidence;
}

export function drawerSummary(x) {
  return {
    name: x.t.name,
    conf: x.t.conf,
    rating: x.t.rating,
    base: x.t.base,
    color: x.t.color,
    po: x.po,
    fin: x.fin,
    title: x.title,
    titleLo: x.titleLo,
    titleHi: x.titleHi
  };
}

export function openTeamDrawer(x) {
  const s = drawerSummary(x);
  const half = ((s.titleHi - s.titleLo) / 2) * 100;
  const host = $("#teamDrawer");
  const body = $("#drawerBody");
  body.innerHTML = `
    <p class="eyebrow">${s.conf} CONF · RATING ${s.rating}</p>
    <h3 class="drawer-title">${s.name}</h3>
    <div class="drawer-odds">
      <div><span>Playoff odds</span><b>${s.po.toFixed(1)}%</b></div>
      <div><span>Finals odds</span><b>${s.fin.toFixed(1)}%</b></div>
      <div><span>Championship odds</span><b>${s.title.toFixed(1)}%</b></div>
      <div><span>95% CI</span><b>± ${half.toFixed(1)} pts</b></div>
    </div>
    <p class="hint">Strength rating ${s.rating} (baseline ${s.base}) drives this team's simulated results. Adjust sliders to model trades or injuries.</p>
  `;
  host.classList.add("open");
  host.setAttribute("aria-hidden", "false");
}

export function closeTeamDrawer() {
  const host = $("#teamDrawer");
  host.classList.remove("open");
  host.setAttribute("aria-hidden", "true");
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
