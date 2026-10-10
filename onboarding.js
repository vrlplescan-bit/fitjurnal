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
// Sporturi: id = hobby-ul corespunzător, kind = tipul activității din program
const SPORTS = [
  { id: "sala", name: "Sală", emoji: "🏋️", kind: "gym", dur: 75 },
  { id: "alergare", name: "Alergare", emoji: "🏃", kind: "run", dur: 40 },
  { id: "inot", name: "Înot", emoji: "🏊", kind: "swim", dur: 45 },
  { id: "bicicleta", name: "Bicicletă", emoji: "🚴", kind: "bike", dur: 60 },
  { id: "yoga", name: "Yoga / stretching", emoji: "🧘", kind: "yoga", dur: 30 },
  { id: "fotbal", name: "Fotbal", emoji: "⚽", kind: "football", dur: 90 },
  { id: "box", name: "Box", emoji: "🥊", kind: "box", dur: 60 },
  { id: "tenis", name: "Tenis", emoji: "🎾", kind: "tennis", dur: 60 },
  { id: "dans", name: "Dans", emoji: "💃", kind: "dance", dur: 60 },
  { id: "drumetii", name: "Drumeții", emoji: "🥾", kind: "hike", dur: 180 },
  { id: "calistenie", name: "Calistenie", emoji: "🤸", kind: "calisthenics", dur: 45 },
  { id: "plimbare", name: "Plimbare", emoji: "🚶", kind: "walk", dur: 40 },
  { id: "baschet", name: "Baschet", emoji: "🏀", kind: "basketball", dur: 60 },
  { id: "escalada", name: "Escaladă", emoji: "🧗", kind: "climb", dur: 90 },
  { id: "arte-martiale", name: "Arte marțiale", emoji: "🥋", kind: "martial", dur: 60 },
];
const SPORT_LANG_HOBBIES = [...SPORTS.map((x) => x.id), "germana", "engleza", "alta-limba"];
const newSport = (id) => ({ id, days: [], time: "18:00", dur: (SPORTS.find((x) => x.id === id) || {}).dur || 60, flex: false, pref: "any", name: "" });

// Profilurile vechi aveau doar sală și alergare: le trecem în lista de sporturi
function sportsOf(p) {
  if (Array.isArray(p.sports)) return p.sports;
  const out = [];
  if (p.gym && p.gym.days && p.gym.days.length) out.push({ ...newSport("sala"), ...p.gym, id: "sala" });
  if (p.run && p.run.days && p.run.days.length) out.push({ ...newSport("alergare"), ...p.run, id: "alergare" });
  return out;
}
const STEPS = ["nume", "calorii", "munca", "sport", "limbi", "hobby", "gata"];
// Ore flexibile: când preferi, iar aplicația caută locul liber din ziua respectivă
const PREFS = [["any", "Oricând am loc"], ["morning", "Dimineața (06–12)"], ["afternoon", "După-amiaza (12–18)"], ["evening", "Seara (17–22)"]];
const PREF_WINDOW = { any: [6 * 60, 22 * 60], morning: [6 * 60, 12 * 60], afternoon: [12 * 60, 18 * 60], evening: [17 * 60, 22 * 60] };
const prefLabel = (pref) => ({ any: "flexibil", morning: "flexibil, dimineața", afternoon: "flexibil, după-amiaza", evening: "flexibil, seara" }[pref] || "flexibil");

const emptyProfile = () => ({
  name: "", sex: "m", age: 25, weight: 75, height: 178, activity: "1.55", goal: "0", kcal: 2600,
  work: { on: true, start: "09:00", end: "17:00", days: [0, 1, 2, 3, 4], commute: 0, meals: "" },
  sports: [],
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
    sports: [
      gym && { ...newSport("sala"), days: daysOf("gym"), time: gym.time, dur: durOf(gym), name: gym.title.split(" – ")[1] || "" },
      run && { ...newSport("alergare"), days: daysOf("run"), time: run.time, dur: durOf(run) },
    ].filter(Boolean),
    langs: [["german", "germana"], ["english", "engleza"]].map(([kind, id]) => {
      const s = first(kind);
      return s && { id, name: "", days: daysOf(kind), time: s.time, dur: durOf(s), until: s.until || "", flex: false, pref: "any" };
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
  buildProfileItems(p);
  state.profileApplied = true;
  save();
}

// Ocupat într-o zi a săptămânii (activitățile care se repetă), în minute
const busyOn = (i) => state.schedule.filter((s) => !s.date && s.day === DAYS[i])
  .map((s) => [toMin(s.time), s.end ? toMin(s.end) : toMin(s.time) + 30]);

function freeSlotIn(i, dur, from, to) {
  const busy = busyOn(i);
  let t = Math.ceil(from / 15) * 15;
  for (let guard = 0; guard < 60 && t + dur <= to; guard++) {
    const clash = busy.find(([a, b]) => t < b && t + dur > a);
    if (!clash) return t;
    t = Math.ceil(clash[1] / 15) * 15;
  }
  return null;
}

// Pune sala, alergarea și limbile în program (refăcut de fiecare dată; ce ai adăugat tu rămâne)
function buildProfileItems(p) {
  state.schedule = state.schedule.filter((s) => !s.profile && !/^f-(gym|run|sp|de|en|lang)/.test(s.id));
  const r = routine();
  const specs = [];
  const add = (id, cfg, dur, title, kind, extra = {}) =>
    cfg.days.forEach((i) => specs.push({ id: `f-${id}-${i}`, i, cfg, dur, title, kind, extra }));
  for (const sp of sportsOf(p)) {
    const S = SPORTS.find((x) => x.id === sp.id);
    if (!S) continue;
    const idp = sp.id === "sala" ? "gym" : sp.id === "alergare" ? "run" : `sp-${sp.id}`;
    const title = sp.id === "sala" ? gymTitle() : `${S.emoji} ${S.name}`;
    add(idp, sp, +sp.dur || S.dur, title, S.kind, { hobby: sp.id });
  }
  p.langs.forEach((l, j) => {
    const L = LANGS.find((x) => x.id === l.id);
    const name = l.id === "alta-limba" ? l.name || "Limbă străină" : L.name;
    add(`lang${j}`, l, +l.dur || 45, `${L.emoji} ${name}`, L.kind, { hobby: l.id, ...(l.until ? { until: l.until } : {}) });
  });

  let skipped = 0;
  // orele fixe primele, ca cele flexibile să se așeze în jurul lor
  for (const sp of specs.sort((a, b) => !!a.cfg.flex - !!b.cfg.flex)) {
    let t;
    if (sp.cfg.flex) {
      const [from, to] = PREF_WINDOW[sp.cfg.pref] || PREF_WINDOW.any;
      // în zilele de lucru, după muncă și drum
      const workDay = r.on && r.days.includes(sp.i);
      const afterWork = workDay ? toMin(r.workEnd) + (r.commute || 0) + 15 : 0;
      // în zilele libere nu începem chiar de la 6: dimineața de la 8, „oricând” de la 9
      const freeDayStart = workDay ? 0 : sp.cfg.pref === "morning" ? 8 * 60 : sp.cfg.pref === "any" ? 9 * 60 : 0;
      // dimineața poate fi și înainte de muncă; restul doar după muncă și drum
      t = freeSlotIn(sp.i, sp.dur, Math.max(from, freeDayStart, sp.cfg.pref === "morning" ? 0 : afterWork), to);
      if (t === null) t = freeSlotIn(sp.i, sp.dur, Math.max(afterWork, 6 * 60), 22 * 60); // altfel, oriunde e loc
    } else {
      // ora fixă; dacă se suprapune, imediat după
      t = freeSlotIn(sp.i, sp.dur, toMin(sp.cfg.time), 23 * 60);
    }
    if (t === null) { skipped++; continue; }
    state.schedule.push({
      id: sp.id, day: DAYS[sp.i], time: fmtTime(t), end: fmtTime(t + sp.dur), title: sp.title, kind: sp.kind,
      profile: true, ...(sp.cfg.flex ? { flex: true } : {}), ...sp.extra,
    });
  }

  state.myHobbies = [...new Set([
    ...p.hobbies,
    ...sportsOf(p).filter((x) => x.days.length).map((x) => x.id),
    ...p.langs.map((l) => l.id),
  ])];
  return skipped;
}

// ===== Pașii =====
const dayChips = (path, sel) => `<div class="day-chips" data-chips="${path}">${SHORT_DAYS.map((d, i) =>
  `<button type="button" class="chip ${sel.includes(i) ? "sel" : ""}" data-d="${i}">${d}</button>`).join("")}</div>`;
// Oră fixă sau flexibilă (path = „sports.0”, „langs.0”)
function timeChoice(path, cfg) {
  return `<div class="seg" data-flex="${path}">
      <button type="button" data-v="fixed" class="${cfg.flex ? "" : "sel"}">⏰ Oră fixă</button>
      <button type="button" data-v="flex" class="${cfg.flex ? "sel" : ""}">🔀 Flexibil</button>
    </div>
    ${cfg.flex
      ? field("Când preferi? Caut locul liber din fiecare zi", sel(`${path}.pref`, cfg.pref || "any", PREFS))
      : field("La ora", inp(`${path}.time`, cfg.time, 'type="time"'))}`;
}
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
        <p class="muted">Ce sporturi faci? Alege-le, apoi zilele și ora.</p>
        <div class="chips">${SPORTS.map((x) => `<button type="button" class="chip ${p.sports.some((y) => y.id === x.id) ? "sel" : ""}" data-sport="${x.id}">${x.emoji} ${x.name}</button>`).join("")}</div>
        ${p.sports.map((sp, j) => {
          const S = SPORTS.find((x) => x.id === sp.id);
          return `<div class="ob-block"><h4>${S.emoji} ${S.name}</h4>
            ${field("În ce zile?", dayChips(`sports.${j}.days`, sp.days))}
            ${timeChoice(`sports.${j}`, sp)}
            ${field("Cât (min)", inp(`sports.${j}.dur`, sp.dur, 'type="number" min="10" max="300" step="5" inputmode="numeric"'))}
            ${sp.id === "sala" ? field("Numele sălii (opțional)", inp(`sports.${j}.name`, sp.name, 'placeholder="ex: Crunch Fit"')) : ""}
          </div>`;
        }).join("")}`;
    case "limbi":
      return `<h2>🗣️ Limbi străine</h2>
        <p class="muted">Înveți vreo limbă? Alege-le, apoi zilele și ora.</p>
        <div class="chips">${LANGS.map((l) => `<button type="button" class="chip ${p.langs.some((x) => x.id === l.id) ? "sel" : ""}" data-lang="${l.id}">${l.emoji} ${l.name}</button>`).join("")}</div>
        ${p.langs.map((l, j) => {
          const L = LANGS.find((x) => x.id === l.id);
          return `<div class="ob-block"><h4>${L.emoji} ${L.name}</h4>
            ${l.id === "alta-limba" ? field("Care limbă?", inp(`langs.${j}.name`, l.name, 'placeholder="ex: Spaniolă"')) : ""}
            ${field("În ce zile?", dayChips(`langs.${j}.days`, l.days))}
            ${timeChoice(`langs.${j}`, l)}
            ${field("Cât (min)", inp(`langs.${j}.dur`, l.dur, 'type="number" min="10" max="240" step="5" inputmode="numeric"'))}
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
      const when = (c) => (c.flex ? prefLabel(c.pref) : `la ${c.time}`);
      return `<h2>Gata, ${esc(p.name || "prietene")}! 🎉</h2>
        <p class="muted">Uite ce pun în aplicație:</p>
        <ul class="ob-summary">
          <li>🔥 <b>${fmtKcal(p.kcal)} kcal</b> pe zi (+ bonus din mișcare)</li>
          <li>💼 ${p.work.on ? `Muncă ${p.work.start}–${p.work.end} · ${days(p.work.days)}` : "Fără program de lucru"}</li>
          ${p.sports.length ? p.sports.map((sp) => { const S = SPORTS.find((x) => x.id === sp.id); return `<li>${S.emoji} ${S.name}: ${days(sp.days)}${sp.days.length ? ` · ${when(sp)}` : ""}</li>`; }).join("") : "<li>🏃 Fără sport (îl poți adăuga oricând)</li>"}
          <li>🗣️ ${p.langs.length ? p.langs.map((l) => `${l.id === "alta-limba" ? l.name || "Altă limbă" : LANGS.find((x) => x.id === l.id).name} (${days(l.days)} · ${when(l)})`).join(", ") : "Fără limbi străine"}</li>
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
  draft = { ...base, ...p, work: { ...base.work, ...(p.work || {}) } };
  draft.sports = sportsOf(p).map((x) => ({ ...newSport(x.id), ...x }));
  delete draft.gym;
  delete draft.run;
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
  const flexBtn = e.target.closest("[data-flex] button");
  if (flexBtn) {
    readStep();
    const path = flexBtn.closest("[data-flex]").dataset.flex;
    const cfg = path.split(".").reduce((o, k) => o[k], draft);
    cfg.flex = flexBtn.dataset.v === "flex";
    if (!cfg.pref) cfg.pref = "any";
    return renderOnboard();
  }
  const sportBtn = e.target.closest("[data-sport]");
  if (sportBtn) {
    readStep();
    const id = sportBtn.dataset.sport;
    draft.sports = draft.sports.some((x) => x.id === id) ? draft.sports.filter((x) => x.id !== id) : [...draft.sports, newSport(id)];
    return renderOnboard();
  }
  const lang = e.target.closest("[data-lang]");
  if (lang) {
    readStep();
    const id = lang.dataset.lang;
    draft.langs = draft.langs.some((l) => l.id === id)
      ? draft.langs.filter((l) => l.id !== id)
      : [...draft.langs, { id, name: "", days: [0, 2, 4], time: "19:00", dur: 45, until: "", flex: false, pref: "any" }];
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
