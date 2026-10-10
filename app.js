// ===== FitJurnal – logica aplicației =====
// Datele se salvează în browser (localStorage).

const APP_VERSION = "20"; // crește-l împreună cu VERSION din sw.js
const STORE_KEY = "fitjurnal-v1";
const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const DAY_COLORS = ["#ff2e93", "#ff8a00", "#ffe600", "#00e676", "#00c6ff", "#a259ff", "#ff6a88"];
const TYPE_COLORS = { Cardio: "#ff2e93", Forță: "#ff8a00", Flexibilitate: "#00e676", Sport: "#00c6ff" };
const MEAL_COLORS = { "Mic dejun": "#ffe600", Prânz: "#ff8a00", Cină: "#a259ff", Gustare: "#00e676" };

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayKey = () => dateKey(new Date());

const emptyState = () => ({
  workouts: [], food: [], schedule: [], journal: [], water: {}, health: {}, kcalGoal: 3000, bonusSeen: {}, customFoods: [], reminderHour: 19, reminderShown: "",
  gistId: "", gistSeen: {}, gistLastSync: "", gistError: "", gistDataAt: "", gistWaitSince: 0,
  shortcutName: "Log Health to GitHub Gist",
});

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    if (data) {
      if (data.kcalGoal === 2200) data.kcalGoal = 3000; // vechiul obiectiv implicit
      return { ...emptyState(), ...data };
    }
  } catch (e) { /* ignorăm */ }
  return emptyState();
}

let state = load();

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorăm */ }
  render();
}

const $ = (sel) => document.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg, ms = 1800) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), ms);
}

// ===== Navigare =====
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    $("#" + btn.dataset.view).classList.add("active");
  });
});

$("#app-version").textContent = APP_VERSION;

// ===== Temă (test): colorată sau cafea =====
function setTheme(name) {
  const cafea = name === "cafea";
  $("#theme-cafea").media = cafea ? "all" : "not all";
  document.querySelector('meta[name="theme-color"]').content = cafea ? "#f7f3ee" : "#0f0c29";
  try { localStorage.setItem("fitjurnal-theme", name); } catch (e) { /* ignorăm */ }
  document.querySelectorAll("#theme-seg button").forEach((b) => b.classList.toggle("sel", b.dataset.theme === name));
}
$("#theme-seg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-theme]");
  if (b) setTheme(b.dataset.theme);
});
setTheme($("#theme-cafea").media === "all" ? "cafea" : "color");

// ===== Aspect compact: cardurile devin cutii cu nume, pliabile =====
// Ce ai deschis/închis se ține minte (doar pe acest telefon).
const FOLD_KEY = "fitjurnal-folds";
let folds = {};
try { folds = JSON.parse(localStorage.getItem(FOLD_KEY)) || {}; } catch (e) { /* ignorăm */ }

document.querySelectorAll(".view").forEach((view) => {
  view.querySelectorAll(".card > h3:first-child").forEach((h, n) => {
    const card = h.parentElement;
    const key = `${view.id}-${n}`;
    card.classList.add("foldable");
    const closed = key in folds ? folds[key] : h.hasAttribute("data-fold-closed");
    card.classList.toggle("folded", closed);
    h.addEventListener("click", (e) => {
      if (!document.documentElement.classList.contains("compact") || e.target.closest("button, input, a")) return;
      folds[key] = card.classList.toggle("folded");
      try { localStorage.setItem(FOLD_KEY, JSON.stringify(folds)); } catch (err) { /* ignorăm */ }
    });
  });
});

function setLayout(name) {
  document.documentElement.classList.toggle("compact", name === "compact");
  try { localStorage.setItem("fitjurnal-layout", name); } catch (e) { /* ignorăm */ }
  document.querySelectorAll("#layout-seg button").forEach((b) => b.classList.toggle("sel", b.dataset.layout === name));
}
$("#layout-seg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-layout]");
  if (b) setLayout(b.dataset.layout);
});
setLayout(document.documentElement.classList.contains("compact") ? "compact" : "normal");

$("#today-date").textContent = new Date().toLocaleDateString("ro-RO", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// ===== Formulare =====
function handleForm(id, fn, msg) {
  $(id).addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (fn(data) === false) return;
    e.target.reset();
    save();
    toast(msg);
  });
}

handleForm("#workout-form", (d) => {
  state.workouts.unshift({ id: uid(), date: todayKey(), ...d, duration: +d.duration, kcal: +d.kcal });
}, "Antrenament adăugat 💪");

let selectedMood = "🙂";
document.querySelectorAll("#moods button").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll("#moods button").forEach((x) => x.classList.remove("sel"));
    b.classList.add("sel");
    selectedMood = b.dataset.mood;
  });
});
document.querySelector('#moods [data-mood="🙂"]').classList.add("sel");

handleForm("#journal-form", (d) => {
  state.journal.unshift({ id: uid(), at: new Date().toISOString(), mood: selectedMood, text: d.text });
}, "Notiță salvată 📓");

// Ștergere (delegare pe tot documentul)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-del]");
  if (!btn) return;
  const [col, id] = btn.dataset.del.split(":");
  state[col] = state[col].filter((x) => x.id !== id);
  save();
});

// Apă
$("#water-add").addEventListener("click", () => {
  const k = todayKey();
  state.water[k] = Math.min((state.water[k] || 0) + 1, 12);
  save();
});
$("#water-reset").addEventListener("click", () => {
  state.water[todayKey()] = 0;
  save();
});

// Obiectiv calorii
$("#kcal-goal").addEventListener("change", (e) => {
  state.kcalGoal = Math.max(500, +e.target.value || 3000);
  save();
});

// ===== Backup: export / import =====
$("#export-btn").addEventListener("click", async () => {
  const json = JSON.stringify({ app: "FitJurnal", version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
  const name = `fitjurnal-backup-${todayKey()}.json`;
  const file = new File([json], name, { type: "application/json" });

  // Pe telefon: meniul de partajare (Salvează în Fișiere, Drive, e-mail...)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Backup FitJurnal" });
      toast("Backup exportat 💾");
      return;
    } catch (e) {
      if (e.name === "AbortError") return; // utilizatorul a anulat
    }
  }

  // Pe calculator: descărcare directă
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup descărcat 💾");
});

$("#import-btn").addEventListener("click", () => $("#import-file").click());

$("#import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const data = parsed.data || parsed;
    const lists = ["workouts", "food", "schedule", "journal"];
    if (!lists.every((k) => Array.isArray(data[k]))) throw new Error("format");
    const count = lists.reduce((n, k) => n + data[k].length, 0);
    if (!confirm(`Backup-ul conține ${count} intrări. Datele actuale vor fi înlocuite. Continui?`)) return;
    state = {
      workouts: data.workouts, food: data.food, schedule: data.schedule, journal: data.journal,
      water: data.water && typeof data.water === "object" ? data.water : {},
      health: data.health && typeof data.health === "object" ? data.health : {},
      kcalGoal: +data.kcalGoal || 3000, bonusSeen: state.bonusSeen,
      customFoods: Array.isArray(data.customFoods) ? data.customFoods : [], reminderHour: data.reminderHour ?? 19,
      gistId: state.gistId, gistSeen: {}, gistLastSync: "", gistError: "",
    };
    save();
    toast("Backup importat ✅");
  } catch (err) {
    alert("Fișierul nu este un backup FitJurnal valid.");
  }
});

// Kcal active ale zilei. Ceasul le măsoară pe toate (inclusiv antrenamentele),
// deci nu le adunăm cu cele scrise de mână, ci o luăm pe cea mai mare.
function burnedOn(date) {
  const watch = (state.health[date] || {}).activeKcal || 0;
  const manual = state.workouts.filter((w) => w.date === date).reduce((s, w) => s + w.kcal, 0);
  return Math.max(watch, manual);
}

const WATER_ML = 500; // un pahar
const fmtLiters = (n) => `${((n * WATER_ML) / 1000).toLocaleString("ro-RO")} L`;

// ===== Randare =====
function render() {
  const today = todayKey();
  const wToday = state.workouts.filter((w) => w.date === today);
  const fToday = state.food.filter((f) => f.date === today);
  const burned = burnedOn(today);
  const eaten = fToday.reduce((s, f) => s + f.kcal, 0);
  const water = state.water[today] || 0;

  // Statistici
  $("#st-kcal-burn").textContent = burned;
  $("#st-kcal-eat").textContent = eaten;
  $("#st-workouts").textContent = wToday.length;
  $("#st-water").textContent = fmtLiters(water);

  // Obiectivul de calorii (inel + bonus) e în calories.js
  if (document.activeElement !== $("#kcal-goal")) $("#kcal-goal").value = state.kcalGoal;

  // Pahare apă
  $("#water-glasses").innerHTML = Array.from({ length: 8 }, (_, i) =>
    `<div class="glass ${i < water ? "full" : ""}"></div>`).join("") +
    (water > 8 ? `<span style="align-self:center">+${water - 8}</span>` : "");
  $("#water-total").textContent = `${fmtLiters(water)} azi (${water} × ${WATER_ML} ml)`;

  // Grafic 7 zile (minute de antrenament)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    const mins = state.workouts.filter((w) => w.date === k).reduce((s, w) => s + w.duration, 0);
    days.push({ label: d.toLocaleDateString("ro-RO", { weekday: "short" }), mins });
  }
  const max = Math.max(30, ...days.map((d) => d.mins));
  $("#week-bars").innerHTML = days.map((d) => `
    <div class="bar">
      <em>${d.mins ? d.mins + "m" : ""}</em>
      <div class="bar-fill" style="height:${(d.mins / max) * 100}%"></div>
      <small>${d.label}</small>
    </div>`).join("");

  // Lista antrenamente
  $("#workout-list").innerHTML = state.workouts.length
    ? state.workouts.map((w) => `<li style="--accent:${TYPE_COLORS[w.type] || "#a259ff"}">
        <span class="tag">${esc(w.type)}</span>
        <div class="grow"><b>${w.source === "watch" ? "⌚ " : ""}${esc(w.name)}</b><small>${esc(w.date)} · ${w.duration} min · ${w.kcal} kcal</small></div>
        <button class="del" data-del="workouts:${w.id}" title="Șterge">✕</button></li>`).join("")
    : `<p class="empty">Niciun antrenament încă. Adaugă primul! 🚀</p>`;

  // Jurnal
  $("#journal-list").innerHTML = state.journal.length
    ? state.journal.map((j) => `<article class="entry">
        <button class="del" data-del="journal:${j.id}">✕</button>
        <div class="mood">${j.mood}</div>
        <time>${new Date(j.at).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</time>
        <p>${esc(j.text)}</p></article>`).join("")
    : `<p class="empty">Jurnalul tău e gol. Scrie primul gând ✍️</p>`;

  // Spațiul ocupat de date pe telefon
  try {
    const bytes = new Blob([localStorage.getItem(STORE_KEY) || ""]).size;
    const days = new Set(state.food.map((f) => f.date)).size || 1;
    const perYear = (bytes / days) * 365;
    $("#storage-info").textContent = `📦 Date salvate pe telefon: ${(bytes / 1024).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} KB din ~5 MB` +
      (state.food.length > 20 ? ` · ajung pentru ~${Math.max(1, Math.floor((5 * 1024 * 1024 - bytes) / perYear))} ani` : "");
  } catch (e) { /* ignorăm */ }

  if (typeof renderHealth === "function") renderHealth();
  if (typeof renderCalories === "function") renderCalories();
  if (typeof renderNutrition === "function") renderNutrition();
  if (typeof renderSchedule === "function") renderSchedule();
  if (typeof renderPlanner === "function") renderPlanner();
  if (typeof renderHobbies === "function") renderHobbies();
  if (typeof renderScreen === "function") renderScreen();
  $("#hello-name").textContent = state.profile && state.profile.name ? `, ${state.profile.name}` : "";
}

render();

// ===== Aplicație instalabilă (PWA) =====
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => {
      // Caută o versiune nouă de fiecare dată când revii în aplicație
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    }).catch(() => {});
  });
  // Versiune nouă instalată: reîncarcă o dată ca s-o folosești imediat
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
}
