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

function addEntry(food, grams, meal) {
  state.food.unshift({ id: uid(), date: todayKey(), foodId: food.id, name: food.name, meal, ...portionOf(food, grams) });
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
  idea.items.forEach((i) => addEntry(i.food, i.grams, "Gustare"));
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
  const today = todayKey();
  const c = calorieDay(today);
  const t = dayTotals(today);
  const goals = goalsFor(c.target);

  $("#food-macros").innerHTML =
    bar("🔥 Calorii", t.kcal, c.target, "kcal", "linear-gradient(90deg,#ff8a00,#ff2e93)") +
    MACROS.map((m) => bar(m.label, t[m.key], goals[m.key], "g", m.color)).join("");

  // Sugestii
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
        <h3>${meal} <small>${fmtKcal(sum)} kcal</small></h3>
        <ul class="list">${list.map((e) => `<li style="--accent:${MEAL_COLORS[meal] || "#ff8a00"}">
          <div class="grow"><b>${esc(e.name)}</b>
            <small>${e.grams ? `${e.grams} g · ` : ""}${e.kcal} kcal · P ${e.protein || 0} g${e.grams ? ` · C ${e.carbs} g · G ${e.fat} g` : ""}</small></div>
          <button class="del" data-del="food:${e.id}" title="Șterge">✕</button></li>`).join("")}</ul>
      </div>`;
    }).join("")
    : `<p class="empty">Nu ai adăugat nimic azi. Caută un aliment mai sus 🍎</p>`;

  if (document.activeElement !== $("#reminder-hour")) $("#reminder-hour").value = state.reminderHour ?? 19;
  checkEveningReminder();
}

renderNutrition();
