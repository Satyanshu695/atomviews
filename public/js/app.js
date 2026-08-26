(() => {
  "use strict";

  const ICONS = {
    "clear": "☀️", "mostly-clear": "🌤️", "partly-cloudy": "⛅", "overcast": "☁️",
    "fog": "🌫️", "drizzle": "🌦️", "sleet": "🌨️", "rain": "🌧️", "snow": "❄️",
    "thunder": "⛈️", "unknown": "❔",
  };
  const iconFor = (key) => ICONS[key] || ICONS.unknown;

  let unit = "metric"; // metric (C, km/h) | imperial (F, mph)
  let current = { lat: null, lon: null, name: "", country: "" };
  const compareList = [];

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, v);
    }
    for (const c of children) node.append(c);
    return node;
  };

  function cToF(c) { return c === null || c === undefined ? null : Math.round((c * 9) / 5 + 32); }
  function kmhToMph(k) { return k === null || k === undefined ? null : Math.round(k * 0.621371); }
  function fmtTemp(c) { if (c === null || c === undefined) return "—"; return unit === "metric" ? Math.round(c) : cToF(c); }
  function fmtWind(k) { if (k === null || k === undefined) return "—"; return unit === "metric" ? `${Math.round(k)} km/h` : `${kmhToMph(k)} mph`; }
  function fmtTime(iso) { if (!iso) return "—"; return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  function fmtDay(iso) { if (!iso) return "—"; return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); }
  function fmtWeekday(iso) { if (!iso) return "—"; return new Date(iso).toLocaleDateString([], { weekday: "short" }); }

  async function api(path, params) {
    const u = new URL(path, window.location.origin);
    for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v);
    const res = await fetch(u.toString());
    const body = await res.json();
    if (!body.success) throw new Error(body.message || "Request failed.");
    return body;
  }

  // ---------- Map ----------
  const map = L.map("map", { worldCopyJump: true }).setView([20, 0], 2);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);
  let marker = null;

  map.on("click", (e) => {
    selectLocation({ latitude: e.latlng.lat, longitude: e.latlng.lng, name: "", country: "" });
  });

  function placeMarker(lat, lon) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], 6);
  }

  // ---------- Search ----------
  const searchForm = $("#search-form");
  const searchInput = $("#search-input");
  const searchResults = $("#search-results");
  let searchTimer = null;

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    if (q.length < 2) { searchResults.hidden = true; return; }
    searchTimer = setTimeout(() => runSearch(q), 300);
  });

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q) runSearch(q);
  });

  document.addEventListener("click", (e) => {
    if (!searchForm.contains(e.target)) searchResults.hidden = true;
  });

  async function runSearch(q) {
    try {
      const body = await api("/api/geocode", { q });
      renderSearchResults(body.results);
    } catch (err) {
      searchResults.hidden = true;
    }
  }

  function renderSearchResults(results) {
    searchResults.innerHTML = "";
    if (!results.length) { searchResults.hidden = true; return; }
    for (const r of results) {
      const parts = [r.admin1, r.country].filter(Boolean).join(", ");
      const item = el("div", { class: "search-result" },
        el("div", {}, r.name),
        el("div", { class: "sr-sub" }, parts));
      item.addEventListener("click", () => {
        searchResults.hidden = true;
        searchInput.value = r.name;
        selectLocation(r);
      });
      searchResults.append(item);
    }
    searchResults.hidden = false;
  }

  $("#use-location").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Geolocation is not available in this browser.");
    navigator.geolocation.getCurrentPosition(
      (pos) => selectLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, name: "My Location", country: "" }),
      () => alert("Could not get your location.")
    );
  });

  $("#unit-toggle").addEventListener("click", (e) => {
    unit = unit === "metric" ? "imperial" : "metric";
    e.target.textContent = unit === "metric" ? "°C" : "°F";
    if (current.lat !== null) loadAll(current);
  });

  // ---------- Location selection ----------
  async function selectLocation(loc) {
    current = { lat: loc.latitude, lon: loc.longitude, name: loc.name || "", country: loc.country || "" };
    placeMarker(current.lat, current.lon);
    $("#empty-state").hidden = true;
    $("#current-panel").hidden = false;
    $("#tabs").hidden = false;
    $("#panels").hidden = false;
    await loadAll(current);
  }

  async function loadAll(loc) {
    await loadCurrent(loc);
    await loadTabData(activeTab());
  }

  function activeTab() {
    return document.querySelector(".tab.active").dataset.tab;
  }

  // ---------- Current ----------
  async function loadCurrent(loc) {
    $("#loc-name").textContent = loc.name || "Selected location";
    $("#loc-meta").textContent = `${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}${loc.country ? " · " + loc.country : ""}`;
    try {
      const body = await api("/api/weather/current", { lat: loc.lat, lon: loc.lon, name: loc.name, country: loc.country });
      const d = body.data;
      $("#cur-icon").textContent = iconFor(d.icon);
      $("#cur-temp").textContent = fmtTemp(d.temperature);
      $("#cur-condition").textContent = d.condition;
      $("#cur-feels").textContent = fmtTemp(d.feels_like);

      const grid = $("#current-grid");
      grid.innerHTML = "";
      const metrics = [
        ["Humidity", `${d.humidity ?? "—"}%`],
        ["Wind", fmtWind(d.wind_speed)],
        ["Gusts", fmtWind(d.wind_gusts)],
        ["Pressure", `${d.pressure ?? "—"} hPa`],
        ["Cloud cover", `${d.cloud_cover ?? "—"}%`],
        ["Precipitation", `${d.precipitation ?? 0} mm`],
      ];
      for (const [label, value] of metrics) {
        grid.append(el("div", { class: "metric" },
          el("span", { class: "metric-label" }, label),
          el("span", { class: "metric-value" }, value)));
      }
    } catch (err) {
      $("#cur-condition").textContent = err.message;
    }
  }

  // ---------- Tabs ----------
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add("active");
      if (current.lat !== null) loadTabData(btn.dataset.tab);
    });
  });

  const loaded = new Set();
  function loadTabData(tab) {
    const key = `${tab}:${current.lat}:${current.lon}:${unit}`;
    if (loaded.has(key)) return;
    loaded.add(key);
    const loaders = {
      hourly: loadHourly, daily: loadDaily, air: loadAir, marine: loadMarine,
      alerts: loadAlerts, astronomy: loadAstronomy, historical: loadHistorical,
      climate: loadClimate, compare: () => {},
    };
    return loaders[tab] ? loaders[tab]() : null;
  }

  // ---------- Hourly ----------
  let hourlyChart = null;
  async function loadHourly() {
    const body = await api("/api/weather/hourly", { lat: current.lat, lon: current.lon, hours: 48 });
    const rows = body.data;
    const labels = rows.map((r) => fmtTime(r.time));
    const temps = rows.map((r) => (unit === "metric" ? r.temperature : cToF(r.temperature)));

    const ctx = document.getElementById("hourly-chart");
    if (hourlyChart) hourlyChart.destroy();
    hourlyChart = new Chart(ctx, {
      type: "line",
      data: { labels, datasets: [{ label: "Temperature", data: temps, borderColor: "#5eb1ff", backgroundColor: "rgba(94,177,255,0.15)", fill: true, tension: 0.35, pointRadius: 0 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#93a1b8", maxTicksLimit: 12 }, grid: { color: "#1e293b" } },
          y: { ticks: { color: "#93a1b8" }, grid: { color: "#1e293b" } },
        },
      },
    });

    const strip = $("#hourly-strip");
    strip.innerHTML = "";
    for (const r of rows.slice(0, 24)) {
      strip.append(el("div", { class: "hour-chip" },
        el("div", { class: "hc-time" }, fmtTime(r.time)),
        el("div", { class: "hc-icon" }, iconFor(r.icon)),
        el("div", { class: "hc-temp" }, `${fmtTemp(r.temperature)}°`)));
    }
  }

  // ---------- Daily ----------
  async function loadDaily() {
    const body = await api("/api/weather/daily", { lat: current.lat, lon: current.lon, days: 16 });
    const rows = body.data;
    const allHighs = rows.map((r) => r.temp_max).filter((v) => v !== null);
    const allLows = rows.map((r) => r.temp_min).filter((v) => v !== null);
    const min = Math.min(...allLows), max = Math.max(...allHighs);

    const list = $("#daily-list");
    list.innerHTML = "";
    for (const r of rows) {
      const lowPct = max > min ? ((r.temp_min - min) / (max - min)) * 100 : 0;
      const highPct = max > min ? ((r.temp_max - min) / (max - min)) * 100 : 100;
      list.append(el("div", { class: "daily-row" },
        el("div", {}, fmtWeekday(r.date)),
        el("div", {},
          el("div", { class: "temp-bar-track" }, el("div", {
            class: "temp-bar",
            style: `margin-left:${lowPct}%; width:${Math.max(4, highPct - lowPct)}%`,
          }))),
        el("div", {}, `${iconFor(r.icon)} ${fmtTemp(r.temp_max)}° / ${fmtTemp(r.temp_min)}°`),
        el("div", { class: "dr-precip" }, `${r.precipitation_probability ?? 0}% · ${r.precipitation ?? 0}mm`)));
    }
  }

  // ---------- Air quality ----------
  async function loadAir() {
    const body = await api("/api/air-quality", { lat: current.lat, lon: current.lon });
    const d = body.data;
    const grid = $("#air-content");
    grid.innerHTML = "";
    const cards = [
      ["US AQI", d.us_aqi ?? "—"], ["Category", d.category], ["European AQI", d.european_aqi ?? "—"],
      ["PM2.5", `${d.pm2_5 ?? "—"} µg/m³`], ["PM10", `${d.pm10 ?? "—"} µg/m³`], ["Ozone", `${d.ozone ?? "—"} µg/m³`],
      ["NO₂", `${d.nitrogen_dioxide ?? "—"} µg/m³`], ["SO₂", `${d.sulphur_dioxide ?? "—"} µg/m³`], ["CO", `${d.carbon_monoxide ?? "—"} µg/m³`],
    ];
    for (const [label, value] of cards) {
      grid.append(el("div", { class: "info-card" }, el("div", { class: "ic-label" }, label), el("div", { class: "ic-value" }, String(value))));
    }
  }

  // ---------- Marine ----------
  async function loadMarine() {
    const body = await api("/api/marine", { lat: current.lat, lon: current.lon });
    const d = body.data;
    const grid = $("#marine-content");
    grid.innerHTML = "";
    if (!d.available) {
      grid.append(el("div", { class: "info-card wide" }, d.message));
      return;
    }
    const first = d.hours[0];
    const cards = [
      ["Wave height", `${first.wave_height ?? "—"} m`], ["Wave period", `${first.wave_period ?? "—"} s`],
      ["Swell height", `${first.swell_wave_height ?? "—"} m`], ["Sea temp", `${fmtTemp(first.sea_surface_temperature)}°`],
    ];
    for (const [label, value] of cards) {
      grid.append(el("div", { class: "info-card" }, el("div", { class: "ic-label" }, label), el("div", { class: "ic-value" }, String(value))));
    }
  }

  // ---------- Alerts ----------
  async function loadAlerts() {
    const body = await api("/api/alerts", { lat: current.lat, lon: current.lon });
    const d = body.data;
    const container = $("#alerts-content");
    container.innerHTML = "";
    if (!d.available) {
      container.append(el("div", { class: "no-alerts" }, d.message));
      return;
    }
    if (!d.alerts.length) {
      container.append(el("div", { class: "no-alerts" }, "No active official alerts for this location."));
      return;
    }
    for (const a of d.alerts) {
      container.append(el("div", { class: `alert-card severity-${a.severity}` },
        el("div", { class: "alert-title" }, `${a.severity}: ${a.title}`),
        el("div", { class: "muted" }, a.area),
        el("p", {}, a.description)));
    }
  }

  // ---------- Astronomy ----------
  async function loadAstronomy() {
    const body = await api("/api/astronomy", { lat: current.lat, lon: current.lon });
    const d = body.data;
    const grid = $("#astronomy-content");
    grid.innerHTML = "";
    const cards = [
      ["Sunrise", fmtTime(d.sunrise)], ["Sunset", fmtTime(d.sunset)], ["Solar noon", fmtTime(d.solar_noon)],
      ["Daylight", `${d.daylight_duration_hours ?? "—"} hrs`], ["Moon phase", d.moon_phase], ["Illumination", `${d.moon_illumination_pct}%`],
    ];
    for (const [label, value] of cards) {
      grid.append(el("div", { class: "info-card" }, el("div", { class: "ic-label" }, label), el("div", { class: "ic-value" }, String(value))));
    }
    grid.append(el("div", { class: "info-card wide muted" }, d.note));
  }

  // ---------- Historical ----------
  let historicalChart = null;
  async function loadHistorical() {
    const body = await api("/api/weather/historical", { lat: current.lat, lon: current.lon });
    const rows = body.data;
    const labels = rows.map((r) => r.date);
    const highs = rows.map((r) => (unit === "metric" ? r.temp_max : cToF(r.temp_max)));
    const lows = rows.map((r) => (unit === "metric" ? r.temp_min : cToF(r.temp_min)));

    const ctx = document.getElementById("historical-chart");
    if (historicalChart) historicalChart.destroy();
    historicalChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "High", data: highs, borderColor: "#ffb84d", pointRadius: 0, tension: 0.3 },
          { label: "Low", data: lows, borderColor: "#5eb1ff", pointRadius: 0, tension: 0.3 },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#e8edf5" } } },
        scales: {
          x: { ticks: { color: "#93a1b8", maxTicksLimit: 10 }, grid: { color: "#1e293b" } },
          y: { ticks: { color: "#93a1b8" }, grid: { color: "#1e293b" } },
        },
      },
    });
  }

  // ---------- Climate ----------
  async function loadClimate() {
    const body = await api("/api/climate", { lat: current.lat, lon: current.lon, years: 10 });
    const d = body.data;
    const grid = $("#climate-content");
    grid.innerHTML = "";
    for (const m of d.months) {
      if (m.no_data) {
        grid.append(el("div", { class: "climate-month" }, el("h4", {}, m.month), el("div", { class: "cm-row" }, "No data")));
        continue;
      }
      grid.append(el("div", { class: "climate-month" },
        el("h4", {}, m.month),
        el("div", { class: "cm-row" }, el("span", {}, "High/Low"), el("span", {}, `${fmtTemp(m.avg_high)}° / ${fmtTemp(m.avg_low)}°`)),
        el("div", { class: "cm-row" }, el("span", {}, "Rainfall"), el("span", {}, `${m.avg_rainfall_mm} mm`)),
        el("div", { class: "cm-row" }, el("span", {}, "Sunshine"), el("span", {}, `${m.avg_sunshine_hours_per_day} h/day`))));
    }
    grid.append(el("div", { class: "info-card wide muted" }, `${d.note} (${d.period})`));
  }

  // ---------- Compare ----------
  $("#compare-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#compare-input");
    const q = input.value.trim();
    if (!q) return;
    try {
      const body = await api("/api/geocode", { q });
      const loc = body.results[0];
      await addCompare(loc);
      input.value = "";
    } catch (err) {
      alert(err.message);
    }
  });

  async function addCompare(loc) {
    if (compareList.some((c) => c.name === loc.name)) return;
    compareList.push(loc);
    renderCompare();
  }

  async function renderCompare() {
    const grid = $("#compare-results");
    grid.innerHTML = "";
    for (const loc of compareList) {
      const card = el("div", { class: "compare-card" },
        el("button", { class: "cc-remove" }, "✕"),
        el("h4", {}, loc.name),
        el("div", { class: "muted" }, "Loading…"));
      card.querySelector(".cc-remove").addEventListener("click", () => {
        const idx = compareList.indexOf(loc);
        if (idx >= 0) compareList.splice(idx, 1);
        renderCompare();
      });
      grid.append(card);
      try {
        const body = await api("/api/weather/current", { lat: loc.latitude, lon: loc.longitude, name: loc.name });
        const d = body.data;
        card.querySelector(".muted").outerHTML = `<div class="ic-value">${iconFor(d.icon)} ${fmtTemp(d.temperature)}°</div><div class="muted">${d.condition}</div>`;
      } catch {
        card.querySelector(".muted").textContent = "Unavailable";
      }
    }
  }
})();
