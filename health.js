// ===== FitJurnal – date de la Apple Watch / Apple Health =====
// Scurtătura iOS „FitJurnal Sync” copiază în clipboard un text ca acesta:
//
//   FITJURNAL
//   data=2026-10-09
//   pasi=8543
//   kcal_active=520
//   antrenament=Alergare;32;310
//
// Aplicația îl primește în trei feluri:
//  1. automat, dintr-un GitHub Gist secret în care scurtătura scrie câte un fișier pe zi;
//  2. din clipboard (butonul „Importă din Sănătate”);
//  3. din adresa paginii: ...#import=<text>.

// Cheile acceptate: cheie din text -> [câmp salvat, e număr întreg?]
const HEALTH_KEYS = {
  pasi: ["steps", true],
  kcal_active: ["activeKcal", true],
  kcal_repaus: ["restingKcal", true],
  distanta_km: ["distanceKm", false],
  exercitiu_min: ["exerciseMin", true],
  ore_in_picioare: ["standHours", true],
  somn_min: ["sleepMin", true],
  puls_repaus: ["restingHr", true],
  puls_mediu: ["avgHr", true],
  etaje: ["flights", true],
};

// Transformă „18120”, „451,015”, „11,877 km”, „1.234,5” în număr.
// Scurtăturile scriu numerele fără separator de mii, cu virgulă (sau punct) pentru zecimale.
// Un singur separator = zecimale; mai multe de același fel = separatoare de mii.
function parseNum(raw, integer) {
  let s = String(raw).replace(/[^\d.,-]/g, "");
  if (!s) return NaN;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = lastDot > lastComma ? "." : ",";
    s = s.split(dec === "." ? "," : ".").join("").replace(dec, ".");
  } else {
    const sep = lastDot >= 0 ? "." : lastComma >= 0 ? "," : "";
    if (sep) {
      const parts = s.split(sep);
      const thousands = parts.length > 2;
      s = thousands ? parts.join("") : parts.join(".");
    }
  }
  const n = parseFloat(s);
  return integer ? Math.round(n) : Math.round(n * 100) / 100;
}

// Durata unui antrenament: „32”, „32 min”, „0:32:10”, „1920” (secunde)
function parseMinutes(raw) {
  const s = String(raw).trim();
  if (s.includes(":")) {
    const p = s.split(":").map((x) => parseInt(x, 10) || 0);
    if (p.length === 3) return Math.round(p[0] * 60 + p[1] + p[2] / 60);
    return Math.round(p[0] + p[1] / 60); // mm:ss
  }
  const n = parseNum(s, false);
  if (/\bh|\bore?\b|hr/i.test(s)) return Math.round(n * 60);
  return Math.round(n > 600 ? n / 60 : n); // peste 600 sunt sigur secunde
}

function workoutType(name) {
  const n = name.toLowerCase();
  if (/forț|forta|strength|greut|funcțional|functional|core|hiit|cross/.test(n)) return "Forță";
  if (/yoga|pilates|stretch|întinder|flexib|mind|cooldown|răcire/.test(n)) return "Flexibilitate";
  if (/alerg|run|merg|walk|cicl|bicic|cycl|bike|înot|inot|swim|row|vâsl|elliptic|eliptic|cardio|drumeț|hik|stair|scări|dans|danc/.test(n)) return "Cardio";
  return "Sport";
}

function parseHealthText(text) {
  const out = { date: todayKey(), metrics: {}, workouts: [] };
  for (const line of String(text).split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (!val) continue;

    if (key === "data") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) out.date = val;
    } else if (key === "antrenament") {
      const [name, dur, kcal] = val.split(";").map((x) => (x || "").trim());
      if (!name) continue;
      out.workouts.push({
        name,
        type: workoutType(name),
        duration: parseMinutes(dur || "0") || 0,
        kcal: parseNum(kcal || "0", true) || 0,
      });
    } else if (HEALTH_KEYS[key]) {
      const [field, integer] = HEALTH_KEYS[key];
      let n = parseNum(val, integer);
      if (Number.isNaN(n)) continue;
      if (field === "sleepMin" && n === 0) continue; // somn necitit: nu ștergem o valoare bună
      if (field === "distanceKm" && n > 200) n = Math.round(n / 10) / 100; // venit în metri
      out.metrics[field] = n;
    }
  }
  if (!Object.keys(out.metrics).length && !out.workouts.length) {
    throw new Error("Textul nu conține date FitJurnal.");
  }
  return out;
}

// quiet = import în fundal: fără salvare și mesaj (le face cine apelează)
function applyHealth(text, quiet) {
  const { date, metrics, workouts } = parseHealthText(text);
  state.health[date] = { ...(state.health[date] || {}), ...metrics, updatedAt: new Date().toISOString() };

  // Antrenamentele de la ceas pentru acea zi se înlocuiesc (fără dubluri la sincronizări repetate)
  if (workouts.length) {
    state.workouts = state.workouts.filter((w) => !(w.source === "watch" && w.date === date));
    state.workouts.unshift(...workouts.map((w) => ({ id: uid(), date, source: "watch", ...w })));
  }
  if (quiet) return;
  save();
  $("#health-manual").hidden = true;
  const n = Object.keys(metrics).length;
  const plural = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  toast(`⌚ Sincronizat: ${plural(n, "valoare", "valori")}${workouts.length ? `, ${plural(workouts.length, "antrenament", "antrenamente")}` : ""}`);
}

// ===== Butoane =====
$("#health-paste").addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    applyHealth(text);
  } catch (e) {
    // Fără acces la clipboard sau text greșit: lipire manuală
    $("#health-manual").hidden = false;
    $("#health-text").focus();
    if (e.message && e.message.includes("FitJurnal")) alert(e.message + " Rulează întâi scurtătura „FitJurnal Sync”.");
  }
});

$("#health-manual-btn").addEventListener("click", () => {
  $("#health-manual").hidden = !$("#health-manual").hidden;
});

$("#health-import").addEventListener("click", () => {
  try {
    applyHealth($("#health-text").value);
    $("#health-text").value = "";
  } catch (e) {
    alert(e.message);
  }
});

// Import din adresă: ...#import=...
function importFromHash() {
  if (!location.hash.startsWith("#import=")) return;
  try {
    applyHealth(decodeURIComponent(location.hash.slice(8)));
  } catch (e) {
    alert(e.message);
  }
  history.replaceState(null, "", location.pathname + location.search);
}
window.addEventListener("hashchange", importFromHash);
importFromHash();

// ===== Sincronizare automată din GitHub Gist =====
// Scurtătura scrie în Gist câte un fișier pe zi (ex. 2026-10-09.txt).
// Aplicația îl citește la deschidere; Gist-ul secret se poate citi fără cheie, doar cu ID-ul.
let syncing = false;
let lastSyncTry = 0;

const gistIdFrom = (s) => (String(s).match(/[0-9a-f]{20,}/i) || [""])[0];

async function autoSync(manual) {
  if (!state.gistId || syncing) return;
  if (!manual && Date.now() - lastSyncTry < 30000) return;
  syncing = true;
  lastSyncTry = Date.now();
  state.gistSeen = state.gistSeen || {};
  try {
    const res = await fetch(`https://api.github.com/gists/${state.gistId}`, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
    });
    if (res.status === 404) throw new Error("Gist-ul nu a fost găsit. Verifică ID-ul.");
    if (res.status === 403) throw new Error("GitHub a limitat temporar accesul. Încearcă peste câteva minute.");
    if (!res.ok) throw new Error(`GitHub a răspuns cu eroarea ${res.status}.`);
    const gist = await res.json();

    let days = 0;
    for (const [name, file] of Object.entries(gist.files || {})) {
      let content = file.content;
      if (file.truncated && file.raw_url) content = await (await fetch(file.raw_url, { cache: "no-store" })).text();
      if (!content || !content.includes("FITJURNAL") || state.gistSeen[name] === content) continue;
      try {
        applyHealth(content, true);
        state.gistSeen[name] = content;
        days++;
      } catch (e) { /* fișier fără date: îl sărim */ }
    }
    state.gistError = "";
    state.gistLastSync = new Date().toISOString();
    save();
    if (days) toast(`⌚ Sincronizat automat: ${days === 1 ? "o zi" : days + " zile"}`);
    else if (manual) toast("⌚ Nimic nou de la ceas");
  } catch (e) {
    state.gistError = navigator.onLine ? e.message : "Fără internet. Reîncerc la următoarea deschidere.";
    save();
    if (manual) alert(state.gistError);
  } finally {
    syncing = false;
  }
}

$("#gist-save").addEventListener("click", () => {
  const id = gistIdFrom($("#gist-id").value);
  if (!id) return alert("Lipește ID-ul sau linkul Gist-ului.");
  state.gistId = id;
  state.gistSeen = {};
  save();
  autoSync(true);
});

$("#gist-now").addEventListener("click", () => autoSync(true));

$("#gist-off").addEventListener("click", () => {
  if (!confirm("Oprești sincronizarea automată? Datele importate rămân.")) return;
  state.gistId = "";
  save();
});

// La deschidere și de fiecare dată când revii în aplicație
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") autoSync(false);
});
window.addEventListener("online", () => autoSync(false));

// ===== Randare =====
const fmtSleep = (min) => (min ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m` : "–");
const fmtNum = (n) => (n || n === 0 ? n.toLocaleString("ro-RO") : "–");

function last7(fn) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString("ro-RO", { weekday: "short" }), value: fn(state.health[dateKey(d)] || {}) || 0 });
  }
  return days;
}

function bars(el, days, fmt, minMax, gradient) {
  const max = Math.max(minMax, ...days.map((d) => d.value));
  el.innerHTML = days.map((d) => `
    <div class="bar">
      <em>${d.value ? fmt(d.value) : ""}</em>
      <div class="bar-fill" style="height:${(d.value / max) * 100}%;${gradient ? `background:${gradient}` : ""}"></div>
      <small>${d.label}</small>
    </div>`).join("");
}

function renderHealth() {
  const h = state.health[todayKey()] || {};

  // Acasă
  $("#st-steps").textContent = fmtNum(h.steps);
  $("#st-sleep").textContent = fmtSleep(h.sleepMin);

  // Sănătate
  const tiles = [
    ["👟", "Pași", fmtNum(h.steps), "c-pink"],
    ["🔥", "Kcal active", fmtNum(h.activeKcal), "c-orange"],
    ["😴", "Somn", fmtSleep(h.sleepMin), "c-purple"],
    ["🏃", "Minute exercițiu", fmtNum(h.exerciseMin), "c-green"],
    ["📍", "Distanță", h.distanceKm ? `${h.distanceKm.toLocaleString("ro-RO")} km` : "–", "c-blue"],
    ["❤️", "Puls repaus", h.restingHr ? `${h.restingHr} bpm` : "–", "c-pink"],
    ["💓", "Puls mediu", h.avgHr ? `${h.avgHr} bpm` : "–", "c-purple"],
    ["🧍", "Ore în picioare", fmtNum(h.standHours), "c-green"],
    ["🔋", "Kcal repaus", fmtNum(h.restingKcal), "c-orange"],
    ["🪜", "Etaje urcate", fmtNum(h.flights), "c-blue"],
  ];
  $("#health-tiles").innerHTML = tiles.map(([ico, label, val, c]) =>
    `<div class="stat ${c}"><div class="stat-ico">${ico}</div><div><b>${val}</b><small>${label}</small></div></div>`).join("");

  $("#health-updated").textContent = h.updatedAt
    ? `Ultima sincronizare: ${new Date(h.updatedAt).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}`
    : "Nicio sincronizare azi. Rulează scurtătura „FitJurnal Sync”, apoi apasă butonul.";

  // Starea sincronizării automate
  const on = !!state.gistId;
  $("#gist-setup").hidden = on;
  $("#gist-on").hidden = !on;
  if (on) {
    $("#gist-status").textContent = state.gistError
      ? `⚠️ ${state.gistError}`
      : state.gistLastSync
        ? `✅ Conectat · verificat ${new Date(state.gistLastSync).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}`
        : "✅ Conectat";
  } else if (document.activeElement !== $("#gist-id")) {
    $("#gist-id").value = "";
  }

  bars($("#steps-bars"), last7((d) => d.steps), (v) => (v >= 1000 ? Math.round(v / 100) / 10 + "k" : v), 10000);
  bars($("#sleep-bars"), last7((d) => d.sleepMin), (v) => Math.round(v / 6) / 10 + "h", 480,
    "linear-gradient(180deg, #c471f5, #0072ff)");
}

renderHealth();
autoSync(false);
