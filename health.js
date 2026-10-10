// ===== FitJurnal – date de la Apple Watch / Apple Health =====
// Scurtătura iOS trimite un text ca acesta:
//
//   FITJURNAL
//   data=2026-10-09
//   pasi=8543
//   kcal_active=520
//   antrenament=Alergare;32;310
//
// Aplicația îl primește automat dintr-un GitHub Gist secret, în care scurtătura
// scrie câte un fișier pe zi, sau din adresa paginii: ...#import=<text>.

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
      // „8.120” la un număr întreg = mii (iPhone-ul în română scrie zecimalele cu virgulă)
      const thousands = parts.length > 2 || (integer && sep === "." && parts[1].length === 3);
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
  const out = { date: todayKey(), metrics: {}, workouts: [], history: {} };
  for (const line of String(text).split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (!val) continue;

    // Istoric: „somn_2026-10-04=420”, „pasi_2026-10-04=8500” (zilele trecute, trimise de scurtătură)
    const hist = key.match(/^([a-z_]+?)_(\d{4}-\d{2}-\d{2})$/);
    if (hist && (HEALTH_KEYS[hist[1]] || HEALTH_KEYS[hist[1] + "_min"])) {
      const [field, integer] = HEALTH_KEYS[hist[1]] || HEALTH_KEYS[hist[1] + "_min"];
      const n = parseNum(val, integer);
      if (!Number.isNaN(n) && n > 0) (out.history[hist[2]] = out.history[hist[2]] || {})[field] = n;
      continue;
    }

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
  if (!Object.keys(out.metrics).length && !out.workouts.length && !Object.keys(out.history).length) {
    throw new Error("Textul nu conține date FitJurnal.");
  }
  return out;
}

// quiet = import în fundal: fără salvare și mesaj (le face cine apelează)
function applyHealth(text, quiet) {
  const { date, metrics, workouts, history } = parseHealthText(text);
  // zilele trecute: completăm doar ce lipsește sau s-a schimbat (ziua principală are prioritate)
  for (const [d, m] of Object.entries(history)) {
    if (d !== date) state.health[d] = { ...(state.health[d] || {}), ...m };
  }
  if (Object.keys(metrics).length || workouts.length) {
    state.health[date] = { ...(state.health[date] || {}), ...metrics, updatedAt: new Date().toISOString() };
  }

  // Antrenamentele de la ceas pentru acea zi se înlocuiesc (fără dubluri la sincronizări repetate)
  if (workouts.length) {
    state.workouts = state.workouts.filter((w) => !(w.source === "watch" && w.date === date));
    state.workouts.unshift(...workouts.map((w) => ({ id: uid(), date, source: "watch", ...w })));
  }
  if (quiet) return;
  save();
  const n = Object.keys(metrics).length;
  const plural = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  toast(`⌚ Sincronizat: ${plural(n, "valoare", "valori")}${workouts.length ? `, ${plural(workouts.length, "antrenament", "antrenamente")}` : ""}`);
}

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

// manual = apăsat de tine (arată mesaje); force = ignoră pauza de 30 s între verificări
// Fișierele „brute” (gist.githubusercontent.com) nu au limita de 60 de cereri pe oră a API-ului,
// dar pot întârzia ~5 minute. Le folosim când API-ul ne limitează.
async function readRawDays() {
  if (!state.gistOwner) return null;
  const out = [];
  for (const k of [todayKey(), dateKey(new Date(Date.now() - 864e5))]) {
    const res = await fetch(`https://gist.githubusercontent.com/${state.gistOwner}/${state.gistId}/raw/${k}.txt?t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) out.push([`${k}.txt`, await res.text()]);
  }
  return out;
}

function applyGistFiles(files) {
  let days = 0;
  for (const [name, content] of files) {
    if (!content || !content.includes("FITJURNAL") || state.gistSeen[name] === content) continue;
    try {
      applyHealth(content, true);
      state.gistSeen[name] = content;
      days++;
    } catch (e) { /* fișier fără date: îl sărim */ }
  }
  return days;
}

// manual = apăsat de tine (arată mesaje); force = ignoră pauza dintre verificări
async function autoSync(manual, force) {
  if (!state.gistId || syncing) return;
  if (!manual && !force && Date.now() - lastSyncTry < 2 * 60 * 1000) return;
  syncing = true;
  lastSyncTry = Date.now();
  state.gistSeen = state.gistSeen || {};
  try {
    // „Verificare condiționată”: dacă nu s-a schimbat nimic, GitHub răspunde 304 și nu se numără la limită
    const headers = { Accept: "application/vnd.github+json" };
    if (state.gistEtag && Object.keys(state.gistSeen).length) headers["If-None-Match"] = state.gistEtag;
    const res = await fetch(`https://api.github.com/gists/${state.gistId}`, { headers, cache: "no-store" });
    let days = 0;

    if (res.status === 304) {
      // nimic nou
    } else if (res.status === 403 || res.status === 429) {
      const reset = +res.headers.get("X-RateLimit-Reset");
      const at = reset ? new Date(reset * 1000).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "";
      const raw = await readRawDays();
      if (!raw) throw new Error(`GitHub limitează verificările${at ? ` până la ${at}` : " câteva minute"}. Datele de la ceas sunt în siguranță.`);
      days = applyGistFiles(raw);
      state.gistNote = `Am citit pe calea de rezervă (poate întârzia ~5 min)${at ? `; verificarea normală revine la ${at}` : ""}.`;
    } else if (res.status === 404) {
      throw new Error("Gist-ul nu a fost găsit. Verifică ID-ul.");
    } else if (!res.ok) {
      throw new Error(`GitHub a răspuns cu eroarea ${res.status}.`);
    } else {
      const gist = await res.json();
      state.gistEtag = res.headers.get("ETag") || "";
      if (gist.owner && gist.owner.login) state.gistOwner = gist.owner.login;
      state.gistDataAt = gist.updated_at || state.gistDataAt;
      const files = [];
      for (const [name, file] of Object.entries(gist.files || {})) {
        let content = file.content;
        if (file.truncated && file.raw_url) content = await (await fetch(file.raw_url, { cache: "no-store" })).text();
        files.push([name, content]);
      }
      days = applyGistFiles(files);
      state.gistNote = "";
    }

    state.gistError = "";
    state.gistLastSync = new Date().toISOString();
    if (days && !state.gistNote) state.gistDataAt = state.gistDataAt || new Date().toISOString();
    save();
    if (days) toast(`⌚ Sincronizat automat: ${days === 1 ? "o zi" : days + " zile"}`);
    else if (manual) toast("⌚ Nimic nou de la ceas");
    return days;
  } catch (e) {
    state.gistError = navigator.onLine ? e.message : "Fără internet. Reîncerc la următoarea deschidere.";
    save();
    if (manual) alert(state.gistError);
  } finally {
    syncing = false;
  }
}

$("#gist-save").addEventListener("click", () => {
  const owner = ($("#gist-id").value.match(/gist\.github\.com\/([^/]+)\/[0-9a-f]{20,}/i) || [])[1];
  if (owner) state.gistOwner = owner;
  const id = gistIdFrom($("#gist-id").value);
  if (!id) return alert("Lipește ID-ul sau linkul Gist-ului.");
  state.gistId = id;
  state.gistSeen = {};
  save();
  autoSync(true);
});

$("#gist-now").addEventListener("click", () => autoSync(true));

// ===== Actualizare la cerere: pornește scurtătura, apoi așteaptă datele noi =====
$("#gist-run").addEventListener("click", () => {
  state.gistWaitSince = Date.now();
  save();
  location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(state.shortcutName)}`;
});

$("#shortcut-name").addEventListener("change", (e) => {
  state.shortcutName = e.target.value.trim() || "Log Health to GitHub Gist";
  save();
});

let waiting = false;
async function waitForFreshData() {
  if (waiting || !state.gistWaitSince) return;
  if (Date.now() - state.gistWaitSince > 3 * 60 * 1000) { // prea vechi: renunțăm
    state.gistWaitSince = 0;
    save();
    return;
  }
  waiting = true;
  renderHealth();
  for (let i = 0; i < 10; i++) { // ~60 s
    const got = await autoSync(false, true);
    if (got || Date.parse(state.gistDataAt) >= state.gistWaitSince - 5000) {
      state.gistWaitSince = 0;
      save();
      toast("⌚ Date noi de la ceas ✅");
      break;
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  if (state.gistWaitSince) {
    state.gistWaitSince = 0;
    save();
    alert("Nu au venit date noi. Verifică dacă scurtătura a rulat până la capăt.");
  }
  waiting = false;
  renderHealth();
}

$("#gist-off").addEventListener("click", () => {
  if (!confirm("Oprești sincronizarea automată? Datele importate rămân.")) return;
  state.gistId = "";
  save();
});

// La deschidere și de fiecare dată când revii în aplicație
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (state.gistWaitSince) waitForFreshData();
  else autoSync(false);
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
    ? `Date de azi primite: ${new Date(h.updatedAt).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}`
    : "Nicio sincronizare azi.";

  // Starea sincronizării automate
  const on = !!state.gistId;
  $("#health-updated").hidden = on; // cu sincronizare, ora utilă e cea de mai jos (din Gist)
  $("#gist-setup").hidden = on;
  $("#gist-on").hidden = !on;
  if (on) {
    const t = (iso) => new Date(iso).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    $("#gist-status").textContent = waiting
      ? "⏳ Aștept datele de la Scurtătură…"
      : state.gistError
        ? `⚠️ ${state.gistError}`
        : state.gistDataAt
          ? `✅ Ultimele date de la ceas: ${t(state.gistDataAt)}${state.gistNote ? ` · ${state.gistNote}` : ""}`
          : `✅ Conectat${state.gistNote ? ` · ${state.gistNote}` : ""}`;
    if (document.activeElement !== $("#shortcut-name")) $("#shortcut-name").value = state.shortcutName || "";
  } else if (document.activeElement !== $("#gist-id")) {
    $("#gist-id").value = "";
  }

  bars($("#steps-bars"), last7((d) => d.steps), (v) => (v >= 1000 ? Math.round(v / 100) / 10 + "k" : v), 10000);
  bars($("#sleep-bars"), last7((d) => d.sleepMin), (v) => Math.round(v / 6) / 10 + "h", 480,
    "linear-gradient(180deg, #c471f5, #0072ff)");

  // Lista nopților, cu media
  const nights = [];
  for (let i = 0; i < 14; i++) {
    const k = dateKey(new Date(Date.now() - i * 864e5));
    const m = (state.health[k] || {}).sleepMin;
    if (m) nights.push({ k, m });
  }
  const avg7 = nights.filter((n) => n.k >= dateKey(new Date(Date.now() - 6 * 864e5)));
  $("#sleep-list").innerHTML = nights.length
    ? `<p class="muted small">Media pe 7 zile: <b>${fmtSleep(Math.round(avg7.reduce((a, n) => a + n.m, 0) / (avg7.length || 1)))}</b> din ${avg7.length} ${avg7.length === 1 ? "noapte" : "nopți"} cu date</p>
       <div class="hrep">${nights.map((n) => `<div><span>${new Date(n.k + "T12:00").toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" })}</span>
         <b class="${n.m < 6 * 60 ? "bad" : n.m >= 7 * 60 ? "ok" : ""}">${fmtSleep(n.m)}</b></div>`).join("")}</div>`
    : `<p class="muted small">Încă nu am nopți salvate.</p>`;
}

renderHealth();
if (state.gistWaitSince) waitForFreshData();
else autoSync(false);
