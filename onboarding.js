// ===== FitJurnal – chestionarul de la prima deschidere =====
// Întreabă: nume, calorii, program de lucru, sport, limbi, hobby-uri.
// Din răspunsuri construiește rutina, programul fix, obiectivul de calorii și lista de hobby-uri.

const LANGS = [
  { id: "germana", name: "Germană", emoji: "🇩🇪", kind: "german" },
  { id: "engleza", name: "Engleză", emoji: "🇬🇧", kind: "english" },
  { id: "alta-limba", name: "Altă limbă", emoji: "🌍", kind: "lang" },
];
const ACTIVITY = [
  ["1.2", "Sedentar – birou, puțină mișcare"],
  ["1.375", "Puțin activ – 1–3 antrenamente pe săptămână"],
  ["1.55", "Activ – 3–5 antrenamente sau muncă fizică"],
  ["1.725", "Foarte activ – sport zilnic sau muncă grea"],
];
const GOALS = [["-400", "Slăbire"], ["0", "Menținere"], ["300", "Masă musculară"]];
const SHORT_DAYS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];
const SPORT_LANG_HOBBIES = ["sala", "alergare", "germana", "engleza", "alta-limba"];
const STEPS = ["nume", "calorii", "munca", "sport", "limbi", "hobby", "gata"];

const emptyProfile = () => ({
  name: "", sex: "m", age: 25, weight: 75, height: 178, activity: "1.55", goal: "0", kcal: 2600,
  work: { on: true, start: "09:00", end: "17:00", days: [0, 1, 2, 3, 4], commute: 0, meals: "" },
  gym: { days: [], time: "18:00", dur: 75, name: "" },
  run: { days: [], time: "18:00", dur: 40 },
  langs: [],
  hobbies: [],
});

// Necesarul de calorii (formula Mifflin-St Jeor × nivelul de activitate ± obiectiv)
function calcKcal(p) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "m" ? 5 : -161);
  return Math.round((bmr * parseFloat(p.activity) + parseFloat(p.goal)) / 50) * 50;
}

let draft = null;
let step = 0;

// ===== Profilul tău de dinainte de chestionar (refăcut din program, fără să schimbăm nimic) =====
if (state.profileApplied && !(state.profile && state.profile.done)) {
  const recurring = state.schedule.filter((s) => !s.date);
  const daysOf = (kind) => [...new Set(recurring.filter((s) => s.kind === kind).map((s) => DAYS.indexOf(s.day)))].filter((i) => i >= 0).sort();
  const first = (kind) => recurring.find((s) => s.kind === kind);
  const durOf = (s) => (s && s.end ? toMin(s.end) - toMin(s.time) : 60);
  const r = routine();
  const base = emptyProfile();
  const gym = first("gym");
  const run = first("run");
  state.profile = {
    ...base, ...(state.profile || {}), kcal: state.kcalGoal,
    work: { on: r.on, start: r.workStart, end: r.workEnd, days: r.days, commute: r.commute, meals: r.meals },
    gym: gym ? { days: daysOf("gym"), time: gym.time, dur: durOf(gym), name: gym.title.split(" – ")[1] || "" } : base.gym,
    run: run ? { days: daysOf("run"), time: run.time, dur: durOf(run) } : base.run,
    langs: [["german", "germana"], ["english", "engleza"]].map(([kind, id]) => {
      const s = first(kind);
      return s && { id, name: "", days: daysOf(kind), time: s.time, dur: durOf(s), until: s.until || "" };
    }).filter(Boolean),
    hobbies: allHobbies().map((h) => h.id).filter((id) => !SPORT_LANG_HOBBIES.includes(id)),
    done: true,
  };
  if (!state.myHobbies) state.myHobbies = allHobbies().map((h) => h.id).filter((id) => id !== "alta-limba");
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorăm */ }
}

// ===== Construiește aplicația din răspunsuri =====
function applyProfile(p) {
  state.profile = { ...p, done: true };
  state.kcalGoal = p.kcal;
  state.routine = { on: p.work.on, workStart: p.work.start, workEnd: p.work.end, meals: p.work.meals, days: p.work.days, commute: +p.work.commute || 0 };
  applyRoutine();

  // programul fix făcut de chestionar se reface; ce ai adăugat tu rămâne
  state.schedule = state.schedule.filter((s) => !s.profile && !/^f-(gym|run|de|en|lang)/.test(s.id));
  const push = (id, i, time, dur, title, kind, extra = {}) => {
    // dacă se suprapune cu ceva din aceeași zi, îl mutăm după
    let t = toMin(time);
    for (let guard = 0; guard < 20; guard++) {
      const clash = state.schedule.find((s) => !s.date && s.day === DAYS[i] && s.end && t < toMin(s.end) && t + dur > toMin(s.time));
      if (!clash) break;
      t = Math.ceil(toMin(clash.end) / 15) * 15;
    }
    if (t + dur > 23 * 60) return;
    state.schedule.push({ id: `f-${id}-${i}`, day: DAYS[i], time: fmtTime(t), end: fmtTime(t + dur), title, kind, profile: true, ...extra });
  };
  p.gym.days.forEach((i) => push("gym", i, p.gym.time, +p.gym.dur || 75, gymTitle(), "gym"));
  p.run.days.forEach((i) => push("run", i, p.run.time, +p.run.dur || 40, "🏃 Alergare", "run"));
  p.langs.forEach((l, j) => {
    const L = LANGS.find((x) => x.id === l.id);
    const name = l.id === "alta-limba" ? l.name || "Limbă străină" : L.name;
    l.days.forEach((i) => push(`lang${j}`, i, l.time, +l.dur || 45, `${L.emoji} ${name}`, L.kind, { hobby: l.id, ...(l.until ? { until: l.until } : {}) }));
  });

  state.myHobbies = [...new Set([
    ...p.hobbies,
    ...(p.gym.days.length ? ["sala"] : []),
    ...(p.run.days.length ? ["alergare"] : []),
    ...p.langs.map((l) => l.id),
  ])];
  state.profileApplied = true;
  save();
}

// ===== Pașii =====
const dayChips = (path, sel) => `<div class="day-chips" data-chips="${path}">${SHORT_DAYS.map((d, i) =>
  `<button type="button" class="chip ${sel.includes(i) ? "sel" : ""}" data-d="${i}">${d}</button>`).join("")}</div>`;
const field = (label, html) => `<label class="ob-field"><span>${label}</span>${html}</label>`;
const inp = (path, value, attrs = "") => `<input data-f="${path}" value="${esc(value ?? "")}" ${attrs}>`;
const sel = (path, value, options) => `<select data-f="${path}">${options.map(([v, t]) => `<option value="${v}" ${String(value) === v ? "selected" : ""}>${t}</option>`).join("")}</select>`;

function stepHtml() {
  const p = draft;
  switch (STEPS[step]) {
    case "nume":
      return `<h2>Bun venit în FitJurnal 👋</h2>
        <p class="muted">Câteva întrebări scurte și îți fac aplicația pe măsură. Durează ~2 minute și poți schimba totul oricând.</p>
        ${field("Cum te numești?", inp("name", p.name, 'placeholder="Numele tău" autocomplete="given-name"'))}`;
    case "calorii":
      return `<h2>🔥 Calorii</h2>
        <p class="muted">Calculez necesarul tău zilnic. Dacă îl știi deja, scrie-l direct jos.</p>
        <div class="seg" data-seg="sex"><button type="button" data-v="m" class="${p.sex === "m" ? "sel" : ""}">Bărbat</button><button type="button" data-v="f" class="${p.sex === "f" ? "sel" : ""}">Femeie</button></div>
        <div class="ob-grid">
          ${field("Vârsta", inp("age", p.age, 'type="number" min="14" max="99" inputmode="numeric"'))}
          ${field("Greutate (kg)", inp("weight", p.weight, 'type="number" min="30" max="250" inputmode="decimal"'))}
          ${field("Înălțime (cm)", inp("height", p.height, 'type="number" min="120" max="230" inputmode="numeric"'))}
        </div>
        ${field("Cât de activ ești?", sel("activity", p.activity, ACTIVITY))}
        ${field("Obiectiv", sel("goal", p.goal, GOALS))}
        ${field("Calorii pe zi (le poți schimba)", inp("kcal", p.kcal, 'type="number" min="1000" max="6000" step="50" inputmode="numeric" class="ob-kcal"'))}
        <p class="muted small">La fiecare 200 kcal arse (de la ceas) primești +200 kcal în plus.</p>`;
    case "munca":
      return `<h2>💼 Program de lucru</h2>
        <label class="check"><input type="checkbox" data-f="work.on" ${p.work.on ? "checked" : ""}> Lucrez sau merg la școală</label>
        <div class="ob-grid">
          ${field("De la", inp("work.start", p.work.start, 'type="time"'))}
          ${field("Până la", inp("work.end", p.work.end, 'type="time"'))}
        </div>
        ${field("În ce zile?", dayChips("work.days", p.work.days))}
        <div class="ob-grid">
          ${field("Drum spre casă (min)", inp("work.commute", p.work.commute, 'type="number" min="0" max="180" step="5" inputmode="numeric"'))}
          ${field("Mănânci la (ex: 10:30)", inp("work.meals", p.work.meals, 'placeholder="10:30, 13:00"'))}
        </div>`;
    case "sport":
      return `<h2>🏋️ Sport</h2>
        <h4>Sală</h4>
        ${field("În ce zile? (niciuna = nu merg)", dayChips("gym.days", p.gym.days))}
        <div class="ob-grid">
          ${field("La ora", inp("gym.time", p.gym.time, 'type="time"'))}
          ${field("Cât (min)", inp("gym.dur", p.gym.dur, 'type="number" min="15" max="240" step="15" inputmode="numeric"'))}
        </div>
        ${field("Numele sălii (opțional)", inp("gym.name", p.gym.name, 'placeholder="ex: Crunch Fit"'))}
        <h4>Alergare</h4>
        ${field("În ce zile?", dayChips("run.days", p.run.days))}
        ${field("La ora", inp("run.time", p.run.time, 'type="time"'))}`;
    case "limbi":
      return `<h2>🗣️ Limbi străine</h2>
        <p class="muted">Înveți vreo limbă? Alege-le, apoi zilele și ora.</p>
        <div class="chips">${LANGS.map((l) => `<button type="button" class="chip ${p.langs.some((x) => x.id === l.id) ? "sel" : ""}" data-lang="${l.id}">${l.emoji} ${l.name}</button>`).join("")}</div>
        ${p.langs.map((l, j) => {
          const L = LANGS.find((x) => x.id === l.id);
          return `<div class="ob-block"><h4>${L.emoji} ${L.name}</h4>
            ${l.id === "alta-limba" ? field("Care limbă?", inp(`langs.${j}.name`, l.name, 'placeholder="ex: Spaniolă"')) : ""}
            ${field("În ce zile?", dayChips(`langs.${j}.days`, l.days))}
            <div class="ob-grid">
              ${field("La ora", inp(`langs.${j}.time`, l.time, 'type="time"'))}
              ${field("Cât (min)", inp(`langs.${j}.dur`, l.dur, 'type="number" min="10" max="240" step="5" inputmode="numeric"'))}
            </div>
            ${field("Curs până la (opțional)", inp(`langs.${j}.until`, l.until, 'type="date"'))}
          </div>`;
        }).join("")}`;
    case "hobby":
      return `<h2>🎯 Hobby-uri</h2>
        <p class="muted">Alege ce-ți place. Îți dau idei practice și te anunț când le lași deoparte.</p>
        ${HOBBY_CATEGORIES.map((c) => {
          const list = c.hobbies.filter((h) => !SPORT_LANG_HOBBIES.includes(h.id));
          if (!list.length) return "";
          return `<h4>${c.name}</h4><div class="chips">${list.map((h) =>
            `<button type="button" class="chip ${p.hobbies.includes(h.id) ? "sel" : ""}" data-h="${h.id}">${h.emoji} ${esc(h.name.split(" – ")[0])}</button>`).join("")}</div>`;
        }).join("")}`;
    case "gata": {
      const days = (a) => (a.length ? a.map((i) => SHORT_DAYS[i]).join(", ") : "–");
      return `<h2>Gata, ${esc(p.name || "prietene")}! 🎉</h2>
        <p class="muted">Uite ce pun în aplicație:</p>
        <ul class="ob-summary">
          <li>🔥 <b>${fmtKcal(p.kcal)} kcal</b> pe zi (+ bonus din mișcare)</li>
          <li>💼 ${p.work.on ? `Muncă ${p.work.start}–${p.work.end} · ${days(p.work.days)}` : "Fără program de lucru"}</li>
          <li>🏋️ Sală: ${days(p.gym.days)}${p.gym.days.length ? ` la ${p.gym.time}` : ""}</li>
          <li>🏃 Alergare: ${days(p.run.days)}${p.run.days.length ? ` la ${p.run.time}` : ""}</li>
          <li>🗣️ ${p.langs.length ? p.langs.map((l) => `${l.id === "alta-limba" ? l.name || "Altă limbă" : LANGS.find((x) => x.id === l.id).name} (${days(l.days)})`).join(", ") : "Fără limbi străine"}</li>
          <li>🎯 ${p.hobbies.length} hobby-uri alese</li>
        </ul>
        <p class="muted small">Le poți schimba oricând din Program sau refăcând chestionarul (Acasă → Backup).</p>`;
    }
  }
  return "";
}

// ===== Citire răspunsuri =====
function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  keys.slice(0, -1).forEach((k) => { o = o[k]; });
  o[keys[keys.length - 1]] = value;
}

function readStep() {
  const box = $("#ob-step");
  box.querySelectorAll("[data-f]").forEach((el) => {
    const v = el.type === "checkbox" ? el.checked : el.type === "number" ? (el.value === "" ? 0 : +el.value) : el.value.trim();
    setPath(draft, el.dataset.f, v);
  });
  box.querySelectorAll("[data-chips]").forEach((el) => {
    setPath(draft, el.dataset.chips, [...el.querySelectorAll(".chip.sel")].map((c) => +c.dataset.d));
  });
}

function renderOnboard() {
  $("#ob-step").innerHTML = stepHtml();
  $("#ob-bar").style.width = `${((step + 1) / STEPS.length) * 100}%`;
  $("#ob-back").style.visibility = step ? "visible" : "hidden";
  $("#ob-next").textContent = step === STEPS.length - 1 ? "✅ Creează aplicația mea" : "Continuă ›";
  $("#ob-close").hidden = !state.profileApplied;
  $("#onboard").scrollTop = 0;
}

function openOnboarding() {
  const base = emptyProfile();
  const p = state.profile && state.profile.done ? JSON.parse(JSON.stringify(state.profile)) : {};
  draft = { ...base, ...p, work: { ...base.work, ...(p.work || {}) }, gym: { ...base.gym, ...(p.gym || {}) }, run: { ...base.run, ...(p.run || {}) } };
  step = 0;
  $("#onboard").hidden = false;
  document.body.classList.add("ob-open");
  renderOnboard();
}

function closeOnboarding() {
  $("#onboard").hidden = true;
  document.body.classList.remove("ob-open");
}

// ===== Interacțiuni =====
$("#onboard").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-chips] .chip, [data-h], [data-seg] button");
  if (chip) {
    if (chip.closest("[data-seg]")) {
      readStep();
      draft[chip.closest("[data-seg]").dataset.seg] = chip.dataset.v;
      draft.kcal = calcKcal(draft);
      return renderOnboard();
    }
    chip.classList.toggle("sel");
    if (chip.dataset.h) {
      const id = chip.dataset.h;
      draft.hobbies = chip.classList.contains("sel") ? [...draft.hobbies, id] : draft.hobbies.filter((x) => x !== id);
    }
    return;
  }
  const lang = e.target.closest("[data-lang]");
  if (lang) {
    readStep();
    const id = lang.dataset.lang;
    draft.langs = draft.langs.some((l) => l.id === id)
      ? draft.langs.filter((l) => l.id !== id)
      : [...draft.langs, { id, name: "", days: [0, 2, 4], time: "19:00", dur: 45, until: "" }];
    return renderOnboard();
  }
});

// Calculatorul de calorii se actualizează în timp ce scrii
$("#onboard").addEventListener("input", (e) => {
  if (STEPS[step] !== "calorii" || !e.target.matches("[data-f=age],[data-f=weight],[data-f=height],[data-f=activity],[data-f=goal]")) return;
  readStep();
  const k = calcKcal(draft);
  if (k > 0) { draft.kcal = k; $(".ob-kcal").value = k; }
});
$("#onboard").addEventListener("change", (e) => {
  if (e.target.matches("[data-f=activity],[data-f=goal]")) e.target.dispatchEvent(new Event("input", { bubbles: true }));
});

$("#ob-back").addEventListener("click", () => { readStep(); step = Math.max(0, step - 1); renderOnboard(); });
$("#ob-next").addEventListener("click", () => {
  readStep();
  if (STEPS[step] === "nume" && !draft.name) return alert("Scrie-ți numele, te rog.");
  if (STEPS[step] === "calorii" && !(draft.kcal >= 1000)) return alert("Calorii pe zi: cel puțin 1000.");
  if (STEPS[step] === "munca" && draft.work.on && draft.work.end <= draft.work.start) return alert("Ora de terminare trebuie să fie după ora de început.");
  if (step < STEPS.length - 1) {
    step++;
    // prima dată: calculăm caloriile din valorile implicite
    if (STEPS[step] === "calorii" && !state.profileApplied && !draft.kcalShown) { draft.kcal = calcKcal(draft); draft.kcalShown = true; }
    return renderOnboard();
  }
  if (state.profileApplied && !confirm("Refac programul din chestionar. Activitățile adăugate de tine rămân. Continui?")) return;
  applyProfile(draft);
  closeOnboarding();
  toast(`Gata, ${draft.name}! Aplicația e făcută pentru tine ✨`, 4000);
});
$("#ob-close").addEventListener("click", closeOnboarding);
$("#redo-onboarding").addEventListener("click", openOnboarding);

// Prima deschidere: chestionarul
if (!state.profileApplied) openOnboarding();
