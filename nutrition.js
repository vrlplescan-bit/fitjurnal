// ===== FitJurnal – alimentație: căutare, gramaj, macro-uri, sugestii =====

const MEALS = ["Mic dejun", "Prânz", "Gustare", "Cină"];
// Împărțirea obiectivului de calorii: proteine 20%, carbohidrați 50%, grăsimi 30%
const MACROS = [
  { key: "protein", label: "Proteine", share: 0.2, kcalPerG: 4, color: "#a259ff" },
  { key: "carbs", label: "Carbohidrați", share: 0.5, kcalPerG: 4, color: "#00c6ff" },
  { key: "fat", label: "Grăsimi", share: 0.3, kcalPerG: 9, color: "#ffe600" },
];
// Idei când nu există încă istoric
const DEFAULT_IDEAS = ["banana", "iaurt-grecesc-2", "migdale", "ou-intreg", "branza-de-vaci-4", "mar",
  "unt-de-arahide", "paine-integrala", "proteina-whey-pudra", "skyr", "fulgi-de-ovaz", "nuci"];

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const r1 = (n) => Math.round(n * 10) / 10;

const allFoods = () => [...(state.customFoods || []), ...FOODS];
const foodById = (id) => allFoods().find((f) => f.id === id);

function portionOf(food, grams) {
  const k = grams / 100;
  return { grams, kcal: Math.round(food.kcal * k), protein: r1(food.p * k), carbs: r1(food.c * k), fat: r1(food.f * k) };
}

const portionText = (food, grams) =>
  grams === food.portion && food.label ? `${food.label} (${grams} g)` : `${grams} g`;

// Ce mănânci des (ultimele 60 de zile) și gramajul tău obișnuit
function foodHabits() {
  const since = dateKey(new Date(Date.now() - 60 * 864e5));
  const map = {};
  for (const e of state.food) {
    if (!e.foodId || e.date < since) continue;
    map[e.foodId] = map[e.foodId] || { count: 0, grams: [] };
    map[e.foodId].count++;
    map[e.foodId].grams.push(e.grams);
  }
  for (const h of Object.values(map)) {
    const g = h.grams.sort((a, b) => a - b);
    h.usual = g[Math.floor(g.length / 2)];
  }
  return map;
}

function dayTotals(date) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of state.food) {
    if (e.date !== date) continue;
    t.kcal += e.kcal || 0;
    t.protein += e.protein || 0;
    t.carbs += e.carbs || 0;
    t.fat += e.fat || 0;
  }
  return t;
}

function mealForNow() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h < 10.5 ? "Mic dejun" : h < 15 ? "Prânz" : h < 18 ? "Gustare" : h < 22 ? "Cină" : "Gustare";
}

// Ziua afișată pe ecranul Alimentație (azi sau o zi din istoric)
let viewDate = todayKey();
const isToday = () => viewDate === todayKey();

function addEntry(food, grams, meal, date = viewDate) {
  state.food.unshift({ id: uid(), date, foodId: food.id, name: food.name, meal, ...portionOf(food, grams) });
}

function dayLabel(date) {
  const d = new Date(date + "T12:00");
  const diff = Math.round((new Date(todayKey() + "T12:00") - d) / 864e5);
  const txt = d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "short" });
  return diff === 0 ? `Azi, ${txt}` : diff === 1 ? `Ieri, ${txt}` : txt.charAt(0).toUpperCase() + txt.slice(1);
}

function shiftDay(delta) {
  const d = new Date(viewDate + "T12:00");
  d.setDate(d.getDate() + delta);
  const k = dateKey(d);
  if (k > todayKey()) return;
  viewDate = k;
  renderNutrition();
}

// ===== Căutare =====
let picked = null;

function searchFoods(q) {
  const habits = foodHabits();
  const words = norm(q).split(/\s+/).filter(Boolean);
  let list = allFoods();
  list = words.length
    ? list.filter((f) => { const n = norm(f.name); return words.every((w) => n.includes(w)); })
    : list.filter((f) => habits[f.id]);
  return list
    .map((f) => ({ f, score: (habits[f.id] ? habits[f.id].count * 10 : 0) + (words.length && norm(f.name).startsWith(words[0]) ? 5 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.f);
}

function renderResults() {
  const q = $("#food-search").value;
  const habits = foodHabits();
  const list = searchFoods(q);
  $("#food-results").innerHTML = list.length
    ? (q.trim() ? "" : `<small class="muted">⭐ Mănânci des:</small>`) + list.map((f) => `
      <button class="food-item" data-food="${esc(f.id)}">
        <span>${habits[f.id] ? "⭐ " : ""}${esc(f.name)}</span>
        <small>${f.kcal} kcal · P ${f.p} g / 100 g</small>
      </button>`).join("")
    : q.trim() ? `<p class="muted small">Nu am găsit „${esc(q)}”. Adaugă-l mai jos cu valorile de pe etichetă.</p>` : "";
}

function pickFood(food) {
  picked = food;
  const usual = (foodHabits()[food.id] || {}).usual;
  $("#pick-name").textContent = food.name;
  $("#pick-per100").textContent = `La 100 g: ${food.kcal} kcal · P ${food.p} g · C ${food.c} g · G ${food.f} g`;
  const chips = [[food.label, food.portion], ...[50, 100, 150, 200].map((g) => [`${g} g`, g])]
    .filter(([label, g], i, a) => label && a.findIndex((x) => x[1] === g) === i);
  $("#pick-chips").innerHTML = chips.map(([label, g]) =>
    `<button type="button" class="chip" data-grams="${g}">${esc(label)}${label.endsWith(" g") ? "" : ` · ${g} g`}</button>`).join("");
  $("#pick-grams").value = usual || food.portion || 100;
  $("#pick-meal").value = mealForNow();
  $("#food-pick").hidden = false;
  $("#food-results").innerHTML = "";
  updatePreview();
}

function updatePreview() {
  if (!picked) return;
  const g = Math.max(0, parseFloat(String($("#pick-grams").value).replace(",", ".")) || 0);
  const p = portionOf(picked, g);
  $("#pick-preview").innerHTML = `
    <div><b>${p.kcal}</b><small>kcal</small></div>
    <div><b>${p.protein}</b><small>proteine</small></div>
    <div><b>${p.carbs}</b><small>carbohidrați</small></div>
    <div><b>${p.fat}</b><small>grăsimi</small></div>`;
  document.querySelectorAll("#pick-chips .chip").forEach((c) => c.classList.toggle("sel", +c.dataset.grams === g));
}

function closePick() {
  picked = null;
  $("#food-pick").hidden = true;
  $("#food-search").value = "";
  renderResults();
}

$("#pick-meal").innerHTML = MEALS.map((m) => `<option>${m}</option>`).join("");
$("#food-search").addEventListener("input", renderResults);
$("#food-search").addEventListener("focus", renderResults);
$("#food-results").addEventListener("click", (e) => {
  const b = e.target.closest("[data-food]");
  if (b) pickFood(foodById(b.dataset.food));
});
$("#pick-chips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-grams]");
  if (!b) return;
  $("#pick-grams").value = b.dataset.grams;
  updatePreview();
});
$("#pick-grams").addEventListener("input", updatePreview);
$("#pick-close").addEventListener("click", closePick);
$("#pick-add").addEventListener("click", () => {
  const g = parseFloat(String($("#pick-grams").value).replace(",", "."));
  if (!picked || !(g > 0)) return alert("Scrie gramajul.");
  const name = picked.name;
  addEntry(picked, Math.round(g), $("#pick-meal").value);
  closePick();
  save();
  toast(`${name} adăugat 🥗`);
});

// ===== Aliment propriu (de pe etichetă) =====
$("#custom-toggle").addEventListener("click", () => {
  $("#custom-form").hidden = !$("#custom-form").hidden;
  if (!$("#custom-form").hidden) $("#custom-form").elements.name.value = $("#food-search").value;
});

$("#custom-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const n = (v) => Math.max(0, parseFloat(String(v).replace(",", ".")) || 0);
  const food = {
    id: "my-" + slug(d.name) + "-" + uid().slice(-4), name: d.name.trim(), cat: "Alimentele mele",
    kcal: n(d.kcal), p: n(d.p), c: n(d.c), f: n(d.f), portion: n(d.portion) || 100, label: "1 porție", custom: true,
  };
  state.customFoods = [food, ...(state.customFoods || [])];
  e.target.reset();
  e.target.hidden = true;
  save();
  toast("Aliment salvat ✅");
  pickFood(food);
});

// ===== Sugestii: ce să mai mănânci ca să ajungi la obiectiv =====
function buildSuggestions(remaining, proteinLeft) {
  if (remaining < 60) return [];
  const habits = foodHabits();
  let cands = Object.entries(habits)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, h]) => ({ food: foodById(id), grams: h.usual }))
    .filter((c) => c.food);
  for (const id of DEFAULT_IDEAS) {
    if (cands.length >= 8) break;
    const f = foodById(id);
    if (f && !cands.some((c) => c.food.id === id)) cands.push({ food: f, grams: f.portion });
  }
  cands = cands
    .map((c) => ({ food: c.food, ...portionOf(c.food, c.grams) }))
    .filter((c) => c.kcal >= 40 && c.food.cat !== "Băuturi");
  if (!cands.length) return [];
  // Dacă mai ai multe proteine de luat, alimentele bogate în proteine vin primele
  if (proteinLeft > 25) cands.sort((a, b) => b.protein / b.kcal - a.protein / a.kcal);

  const variants = [];
  const seen = new Set();
  for (let v = 0; v < cands.length && variants.length < 3; v++) {
    const order = [...cands.slice(v), ...cands.slice(0, v)];
    let items = [];
    let total = 0;
    for (const c of order) {
      if (items.length >= 4) break;
      if (total + c.kcal <= remaining * 1.1) { items.push({ ...c }); total += c.kcal; }
      if (total >= remaining * 0.9) break;
    }
    if (!items.length) {
      // Ai nevoie de mai puțin decât o porție: o micșorăm
      const f = order[0].food;
      const g = Math.max(10, Math.round((remaining / f.kcal) * 10) * 10);
      items = [{ food: f, ...portionOf(f, g) }];
    } else if (total < remaining * 0.9) {
      // Mărim prima porție ca să ajungem mai aproape (cel mult dublu)
      const it = items[0];
      const g = Math.min(it.grams * 2, Math.round((it.grams + ((remaining - total) / it.food.kcal) * 100) / 10) * 10);
      Object.assign(it, portionOf(it.food, g));
    }
    const key = items.map((i) => i.food.id).sort().join("+");
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push({
      items,
      kcal: items.reduce((s, i) => s + i.kcal, 0),
      protein: r1(items.reduce((s, i) => s + i.protein, 0)),
    });
  }
  return variants;
}

const ideaText = (v) => v.items.map((i) => `${portionText(i.food, i.grams)} ${i.food.name.toLowerCase()}`).join(" + ");

let currentIdeas = [];
$("#food-suggest").addEventListener("click", (e) => {
  const b = e.target.closest("[data-idea]");
  if (!b) return;
  const idea = currentIdeas[+b.dataset.idea];
  if (!idea) return;
  idea.items.forEach((i) => addEntry(i.food, i.grams, "Gustare", todayKey()));
  save();
  toast(`Adăugat: ${idea.kcal} kcal 🥗`);
});

// ===== Reamintire seara =====
function checkEveningReminder() {
  const hour = state.reminderHour ?? 19;
  const now = new Date();
  const today = todayKey();
  if (now.getHours() < hour || state.reminderShown === today) return;
  const c = calorieDay(today);
  if (c.left < 100) return;
  const t = dayTotals(today);
  const idea = c.left <= 900 ? buildSuggestions(c.left, goalsFor(c.target).protein - t.protein)[0] : null;
  state.reminderShown = today;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorăm */ }
  const msg = `Mai ai ${fmtKcal(c.left)} kcal de mâncat azi.${idea ? ` Idee: ${ideaText(idea)} (${idea.kcal} kcal).` : ""}`;
  toast("🍽️ " + msg, 7000);
  notifySystem(msg, "FitJurnal 🍽️");
}
setInterval(checkEveningReminder, 60 * 1000);

$("#reminder-hour").addEventListener("change", (e) => {
  const h = Math.min(23, Math.max(0, parseInt(e.target.value, 10)));
  state.reminderHour = Number.isNaN(h) ? 19 : h;
  save();
});

// ===== Istoric =====
$("#day-prev").addEventListener("click", () => shiftDay(-1));
$("#day-next").addEventListener("click", () => shiftDay(1));
$("#day-today").addEventListener("click", () => { viewDate = todayKey(); renderNutrition(); });

$("#food-history").addEventListener("click", (e) => {
  const b = e.target.closest("[data-day]");
  if (!b) return;
  viewDate = b.dataset.day;
  renderNutrition();
  $("#food").scrollIntoView({ behavior: "smooth" });
});

// Copiază o masă dintr-o zi trecută în ziua de azi
$("#food-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-copy-meal]");
  if (!b) return;
  const meal = b.dataset.copyMeal;
  const items = state.food.filter((f) => f.date === viewDate && f.meal === meal);
  const today = todayKey();
  state.food.unshift(...items.map((f) => ({ ...f, id: uid(), date: today })));
  save();
  toast(`${meal} copiat în ziua de azi ✅`);
});

function renderHistory() {
  const rows = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    const t = dayTotals(k);
    const target = calorieDay(k).target;
    rows.push({ k, t, target, label: i === 0 ? "Azi" : i === 1 ? "Ieri" : d.toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" }) });
  }
  const logged = rows.filter((r) => r.t.kcal > 0);
  const avg = (key) => (logged.length ? Math.round(logged.reduce((s, r) => s + r.t[key], 0) / logged.length) : 0);
  $("#food-history").innerHTML = `
    <p class="muted small">${logged.length ? `Media zilelor notate: <b>${fmtKcal(avg("kcal"))} kcal</b> · <b>${avg("protein")} g proteine</b>` : "Încă nu ai zile notate."}</p>
    ${rows.map((r) => {
      const pct = r.target ? Math.min(100, (r.t.kcal / r.target) * 100) : 0;
      const ok = r.t.kcal >= r.target * 0.9 && r.t.kcal <= r.target * 1.1;
      return `<button class="hist-row ${r.k === viewDate ? "sel" : ""}" data-day="${r.k}">
        <span class="hist-day">${r.label}</span>
        <span class="hist-bar"><span style="width:${pct}%" class="${ok ? "ok" : ""}"></span></span>
        <span class="hist-val">${r.t.kcal ? `${fmtKcal(r.t.kcal)}<small> / ${fmtKcal(r.target)}</small>` : "–"}</span>
      </button>`;
    }).join("")}`;
}

// ===== Randare =====
function goalsFor(target) {
  const g = {};
  for (const m of MACROS) g[m.key] = Math.round((target * m.share) / m.kcalPerG);
  return g;
}

function bar(label, value, goal, unit, color) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  return `<div class="mbar">
    <div class="mbar-top"><span>${label}</span><b>${fmtKcal(value)} / ${fmtKcal(goal)} ${unit}</b></div>
    <div class="mbar-track"><div style="width:${pct}%;background:${color}"></div></div>
  </div>`;
}

function renderNutrition() {
  if (viewDate > todayKey()) viewDate = todayKey();
  const today = viewDate;
  const c = calorieDay(today);
  const t = dayTotals(today);

  $("#day-label").textContent = dayLabel(today);
  $("#day-next").disabled = isToday();
  $("#day-today").hidden = isToday();
  $("#macros-title").textContent = isToday() ? "Azi 📊" : "Ziua aceea 📊";
  const goals = goalsFor(c.target);

  $("#food-macros").innerHTML =
    bar("🔥 Calorii", t.kcal, c.target, "kcal", "linear-gradient(90deg,#ff8a00,#ff2e93)") +
    MACROS.map((m) => bar(m.label, t[m.key], goals[m.key], "g", m.color)).join("");

  // Sugestii (doar pentru azi)
  $("#suggest-card").hidden = !isToday();
  const left = c.target - t.kcal;
  const proteinLeft = goals.protein - t.protein;
  // Dacă mai ai mult de mâncat, sugestiile sunt pentru următoarea masă (~700–800 kcal)
  const chunk = left <= 900 ? left : Math.round(left / Math.ceil(left / 800));
  currentIdeas = buildSuggestions(chunk, proteinLeft);
  $("#food-suggest").innerHTML = left < 60
    ? `<p class="suggest-done">${left < -60 ? `Ești cu ${fmtKcal(-left)} kcal peste obiectivul de azi.` : "🎉 Ai atins obiectivul de azi!"}</p>`
    : `<p class="muted">Mai ai <b>${fmtKcal(left)} kcal</b>${proteinLeft > 5 ? ` și <b>${Math.round(proteinLeft)} g proteine</b>` : ""} până la obiectiv.
        ${chunk < left ? `Idei pentru următoarea masă (~${fmtKcal(chunk)} kcal):` : "Idei ca să ajungi la obiectiv:"}</p>` +
      currentIdeas.map((v, i) => `
        <div class="idea">
          <div class="grow">${v.items.map((it) => `<span>${esc(portionText(it.food, it.grams))} <b>${esc(it.food.name)}</b></span>`).join("<em>+</em>")}
            <small>= ${v.kcal} kcal · ${v.protein} g proteine</small></div>
          <button class="btn btn-green" data-idea="${i}">＋ Adaug</button>
        </div>`).join("");

  // Lista de azi, pe mese
  const entries = state.food.filter((f) => f.date === today);
  $("#food-list").innerHTML = entries.length
    ? MEALS.map((meal) => {
      const list = entries.filter((e) => e.meal === meal);
      if (!list.length) return "";
      const sum = list.reduce((s, e) => s + (e.kcal || 0), 0);
      return `<div class="card meal">
        <h3>${meal} <small>${fmtKcal(sum)} kcal</small>
          ${isToday() ? "" : `<button class="btn btn-ghost copy-meal" data-copy-meal="${meal}">↺ Copiază în azi</button>`}</h3>
        <ul class="list">${list.map((e) => `<li style="--accent:${MEAL_COLORS[meal] || "#ff8a00"}">
          <div class="grow"><b>${esc(e.name)}</b>
            <small>${e.grams ? `${e.grams} g · ` : ""}${e.kcal} kcal · P ${e.protein || 0} g${e.grams ? ` · C ${e.carbs} g · G ${e.fat} g` : ""}</small></div>
          <button class="del" data-del="food:${e.id}" title="Șterge">✕</button></li>`).join("")}</ul>
      </div>`;
    }).join("")
    : `<p class="empty">${isToday() ? "Nu ai adăugat nimic azi. Caută un aliment mai sus 🍎" : "Nimic notat în ziua aceasta."}</p>`;

  renderHistory();

  if (document.activeElement !== $("#reminder-hour")) $("#reminder-hour").value = state.reminderHour ?? 19;
  checkEveningReminder();
}

renderNutrition();
