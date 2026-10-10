// ===== FitJurnal – planificator: rutina de lucru, analiza săptămânii, sugestii, roata norocului =====

const SLEEP_GOAL = 8 * 60; // minute; adulții au nevoie de 7–9 ore
const SLEEP_LOW = 6.5 * 60;
const STEPS_LOW = 6000;

// ===== Rutina zilelor lucrătoare =====
// Se completează din chestionarul de la prima deschidere (onboarding.js).
const DEFAULT_ROUTINE = { on: false, workStart: "09:00", workEnd: "17:00", meals: "", days: [0, 1, 2, 3, 4], commute: 0 };
const routine = () => ({ ...DEFAULT_ROUTINE, ...(state.routine || {}) });
const gymTitle = () => `🏋️ Sală${state.profile && state.profile.gym && state.profile.gym.name ? ` – ${state.profile.gym.name}` : ""}`;

function applyRoutine() {
  const r = routine();
  state.schedule = state.schedule.filter((s) => !s.routine);
  if (r.on) {
    const meals = String(r.meals).split(/[,\s]+/).filter((t) => /^\d{1,2}:\d{2}$/.test(t)).map((t) => t.padStart(5, "0"));
    for (const i of r.days) {
      state.schedule.push({ id: `r-work-${i}`, day: DAYS[i], time: r.workStart, end: r.workEnd, title: "💼 Muncă", kind: "work", routine: true });
      if (r.commute > 0) state.schedule.push({ id: `r-drum-${i}`, day: DAYS[i], time: r.workEnd, end: fmtTime(toMin(r.workEnd) + r.commute), title: "🚇 Drum spre casă", kind: "commute", routine: true });
      meals.forEach((t, j) => state.schedule.push({ id: `r-meal-${i}-${j}`, day: DAYS[i], time: t, title: "🍽️ Masă", kind: "meal", routine: true }));
    }
  }
  state.routineApplied = true;
}

$("#routine-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  if (d.workEnd <= d.workStart) return alert("Ora de terminare trebuie să fie după ora de început.");
  const days = [...e.target.querySelectorAll("[name=rday]:checked")].map((c) => +c.value);
  state.routine = { ...routine(), on: !!d.on, workStart: d.workStart, workEnd: d.workEnd, meals: d.meals, days, commute: Math.max(0, parseInt(d.commute, 10) || 0) };
  applyRoutine();
  // activitățile flexibile din chestionar se rearanjează după noua rutină
  if (state.profile && state.profile.done && typeof buildProfileItems === "function") {
    const r = routine();
    state.profile.work = { on: r.on, start: r.workStart, end: r.workEnd, days: r.days, commute: r.commute, meals: r.meals };
    buildProfileItems(state.profile);
  }
  save();
  toast("Rutina salvată ✅");
});

// ===== Analiza ultimelor 7 zile =====
function weekStats() {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const sleeps = days.map((k) => (state.health[k] || {}).sleepMin).filter((m) => m > 0);
  const steps = days.map((k) => (state.health[k] || {}).steps).filter((n) => n > 0);
  // ore de muncă din program, în ultimele 7 zile
  const workMin = days.reduce((sum, k) => sum + eventsForDate(k)
    .filter((s) => s.kind === "work" && s.end).reduce((a, s) => a + toMin(s.end) - toMin(s.time), 0), 0);
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
  return {
    nights: sleeps.length,
    sleepAvg: avg(sleeps),
    shortNights: sleeps.filter((m) => m < 6 * 60).length,
    sleepDebt: sleeps.reduce((d, m) => d + Math.max(0, SLEEP_GOAL - m), 0),
    stepsAvg: avg(steps),
    workHours: Math.round(workMin / 60),
  };
}

// ===== Încărcarea programului în următoarele 7 zile =====
const RE_RELAX = /relax|anime|plimb|prieten|recuper|odihn|pauz|somn de prânz|muzeu|citit|dostoievski|liber|picnic/i;
const RE_STUDY = /germ|engl|javascript|dom|programare|github|python|ollama|matematic|goethe/i;
const STUDY_HOBBIES = ["germana", "engleza", "alta-limba", "js", "ai", "mate"];

function dayLoad(k) {
  const ev = eventsForDate(k);
  const dur = (e) => (e.end ? toMin(e.end) - toMin(e.time) : 30);
  const work = ev.filter((e) => e.kind === "work").reduce((a, e) => a + dur(e), 0);
  const acts = ev.filter((e) => !["work", "commute", "meal"].includes(e.kind) && !/culcare|masă|mic dejun|prânz|cină/i.test(e.title));
  const actMin = acts.reduce((a, e) => a + dur(e), 0);
  const study = acts.filter((e) => RE_STUDY.test(e.title) || STUDY_HOBBIES.includes(e.hobby) || ["german", "english", "code"].includes(e.kind)).reduce((a, e) => a + dur(e), 0);
  const relax = acts.some((e) => RE_RELAX.test(e.title) || e.hobby === "anime" || e.plan === "recuperare");
  const heavy = (work && actMin >= 240) || work + actMin >= 12 * 60;
  return { k, work, actMin, study, relax, heavy, free: work ? actMin < 90 : actMin < 180 };
}

function loadStats() {
  const days = Array.from({ length: 7 }, (_, i) => dayLoad(addDays(todayKey(), i)));
  return {
    days,
    heavy: days.filter((d) => d.heavy),
    study: days.reduce((a, d) => a + d.study, 0),
    relaxDays: days.filter((d) => d.relax || d.free).length,
  };
}

function loadHtml(L) {
  const out = [];
  for (const d of L.heavy.slice(0, 2)) {
    out.push(`<p class="warn">⚠️ <b>${DAYS[dayOfKey(d.k)]}</b> e plin: ${d.work ? `${hm(d.work)} muncă + ` : ""}${hm(d.actMin)} activități. Pune o pauză de 30 min între ele.</p>`);
  }
  if (L.study >= 10 * 60) out.push(`<p>📚 Înveți ~${Math.round(L.study / 60)}h în următoarele 7 zile. Bine – dar nu mai adăuga. Lasă și o seară liberă.</p>`);
  if (L.relaxDays === 0) out.push(`<p class="warn">🛋️ Nu ai nicio seară liberă în următoarele 7 zile. Alege una doar pentru tine: plimbare, anime, prieteni.</p>`);
  else if (L.heavy.length >= 3 && L.relaxDays < 2) out.push(`<p>🛋️ Săptămână grea. Păstrează măcar o seară pentru relaxare.</p>`);
  return out.join("");
}

function analysisHtml(w) {
  const parts = [];
  if (!w.nights) {
    parts.push(`<p>😴 Încă nu am date de somn pentru ultimele zile. Se adună singure din Scurtătura de la ceas.</p>`);
  } else if (w.sleepAvg < 6 * 60) {
    parts.push(`<p class="warn">😴 În ultimele 7 zile ai dormit în medie <b>${fmtSleep(w.sleepAvg)}</b> pe noapte (${w.nights} ${w.nights === 1 ? "noapte" : "nopți"} cu date). E puțin – un adult are nevoie de <b>7–9 ore</b>.</p>
      <p>Ca să te recuperezi: culcă-te cu cel puțin o oră mai devreme în serile de lucru, iar în weekend dormi 8–9 ore și ia un somn de 20–30 de minute după-amiaza. Datoria de somn a săptămânii: <b>~${Math.round(w.sleepDebt / 60)} ore</b>.</p>`);
  } else if (w.sleepAvg < 7 * 60) {
    parts.push(`<p>😐 Ai dormit în medie <b>${fmtSleep(w.sleepAvg)}</b> pe noapte – puțin sub ideal (7–9 ore). Încearcă să te culci cu 30 de minute mai devreme.</p>`);
  } else {
    parts.push(`<p class="good">✅ Ai dormit bine: <b>${fmtSleep(w.sleepAvg)}</b> pe noapte, în medie.</p>`);
  }
  const extra = [];
  if (w.workHours) extra.push(`💼 ~${w.workHours} ore de muncă`);
  if (w.stepsAvg) extra.push(`👟 ${w.stepsAvg.toLocaleString("ro-RO")} pași/zi${w.stepsAvg < STEPS_LOW ? " (puțin)" : ""}`);
  if (extra.length) parts.push(`<p class="muted small">${extra.join(" · ")} în ultimele 7 zile</p>`);
  parts.push(loadHtml(loadStats()));
  return parts.join("");
}

// ===== Programe pentru weekend (roata norocului) =====
const DAY_PLANS = [
  { id: "activa", emoji: "🏃", name: "Zi activă", color: "#ff2e93", items: [
    ["09:00", "🥣 Mic dejun consistent"], ["10:00", "🏃 Alergare sau bicicletă 45 min"], ["13:00", "🍽️ Prânz"],
    ["15:30", "🚶 Plimbare în parc"], ["19:00", "🍽️ Cină"], ["22:30", "😴 Culcare"]] },
  { id: "recuperare", emoji: "😴", name: "Zi de recuperare", color: "#a259ff", items: [
    ["09:30", "😴 Trezire fără alarmă"], ["10:00", "🥣 Mic dejun liniștit"], ["12:00", "🚶 Plimbare ușoară 30 min"],
    ["14:30", "💤 Somn de prânz 20–30 min"], ["17:00", "🧘 Stretching / yoga 20 min"], ["21:30", "📵 Fără ecrane"], ["22:00", "😴 Culcare devreme"]] },
  { id: "aer-liber", emoji: "🌳", name: "Zi în aer liber", color: "#00e676", items: [
    ["08:30", "🥣 Mic dejun"], ["09:30", "🥾 Drumeție / ieșire în natură"], ["13:00", "🧺 Picnic"],
    ["17:00", "🛋️ Relaxare"], ["19:30", "🍽️ Cină"], ["23:00", "😴 Culcare"]] },
  { id: "sala", emoji: "🏋️", name: "Zi de sală", color: "#ff8a00", items: [
    ["09:00", "🥣 Mic dejun"], ["11:00", "🏋️ Sală – antrenament complet"], ["13:00", "🍗 Prânz bogat în proteine"],
    ["16:00", "🍌 Gustare"], ["19:00", "🍽️ Cină"], ["22:30", "😴 Culcare"]] },
  { id: "meal-prep", emoji: "👨‍🍳", name: "Gătit pentru săptămână", color: "#00c6ff", items: [
    ["10:00", "🛒 Cumpărături pentru săptămână"], ["12:00", "👨‍🍳 Gătit pentru 3–4 zile"], ["14:00", "🍽️ Prânz"],
    ["16:00", "🚶 Plimbare 30 min"], ["19:00", "🍽️ Cină"], ["22:30", "😴 Culcare"]] },
  { id: "sociala", emoji: "🎉", name: "Zi cu prietenii", color: "#ffe600", items: [
    ["10:00", "☕ Mic dejun în oraș"], ["12:00", "⚽ Sport cu prietenii"], ["15:00", "🍽️ Prânz"],
    ["18:00", "🎉 Ieșire cu prietenii"], ["23:00", "😴 Culcare"]] },
  { id: "content", emoji: "📸", name: "Zi de content", color: "#ff6a88", items: [
    ["09:30", "🥣 Mic dejun"], ["10:30", "📸 Ieșire foto – portrete cu 85mm"], ["13:00", "🍽️ Prânz"],
    ["14:30", "🎨 Editare în Lightroom – 10 cele mai bune"], ["16:30", "🎬 Filmează un vlog scurt"], ["19:00", "🍽️ Cină"], ["22:30", "😴 Culcare"]] },
  { id: "proiect", emoji: "💻", name: "Zi de proiect", color: "#7b2ff7", items: [
    ["09:30", "🥣 Mic dejun"], ["10:00", "💻 JavaScript – 2h pe un proiect DOM"], ["12:30", "🍽️ Prânz"],
    ["14:00", "🏋️ Sală – antrenament"], ["16:30", "💻 Pune proiectul pe GitHub"], ["19:00", "🍽️ Cină"], ["22:30", "😴 Culcare"]] },
  { id: "cultura", emoji: "🏛️", name: "Zi de cultură", color: "#c471f5", items: [
    ["10:00", "🥣 Mic dejun"], ["11:00", "🏛️ Muzeu de artă"], ["14:00", "🍽️ Prânz"],
    ["16:00", "📖 Dostoievski – 1h de citit"], ["18:00", "🇩🇪 Germană – 30 min, ușor"], ["19:30", "🍽️ Cină"], ["23:00", "😴 Culcare"]] },
];

function recommendedPlan(w) {
  if (w.nights && w.sleepAvg < SLEEP_LOW) return { plan: DAY_PLANS[1], why: `ai dormit în medie doar ${fmtSleep(w.sleepAvg)} pe noapte` };
  if (w.stepsAvg && w.stepsAvg < STEPS_LOW) return { plan: DAY_PLANS[0], why: `te-ai mișcat puțin (${w.stepsAvg.toLocaleString("ro-RO")} pași/zi)` };
  // Odihnit și activ: alternăm între content, proiect și cultură (după data zilei)
  const pick = ["content", "proiect", "cultura"][new Date().getDate() % 3];
  return { plan: DAY_PLANS.find((p) => p.id === pick), why: w.nights ? "ești odihnit și te miști destul" : "e timp pentru obiectivele tale" };
}

function applyPlan(plan, k) {
  state.schedule = state.schedule.filter((s) => !(s.plan && s.date === k));
  const day = DAYS[dayOfKey(k)];
  plan.items.forEach(([time, title], j) =>
    state.schedule.push({ id: `p-${k}-${j}-${uid().slice(-3)}`, day, date: k, time, title, plan: plan.id }));
  save();
  toast(`${plan.emoji} ${plan.name} – adăugat în program`);
}

// ===== Sugestii pentru o zi =====
function daySuggestions(k, w) {
  const ev = eventsForDate(k);
  const nowMin = k === todayKey() ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
  const has = (from, to, re) => ev.some((e) => toMin(e.time) >= from && toMin(e.time) <= to && re.test(e.title));
  const ideas = [];
  const work = ev.find((e) => e.kind === "work" && e.end);
  const h = state.health[todayKey()] || {};
  const lastNight = k === todayKey() ? h.sleepMin : 0;
  const sleepLow = (w.nights && w.sleepAvg < SLEEP_LOW) || (lastNight && lastNight < SLEEP_LOW);

  // Orele ocupate (program + ideile deja propuse), ca ideile să nu se suprapună
  const busy = ev.map((e) => [toMin(e.time), e.end ? toMin(e.end) : toMin(e.time) + 30]);
  const place = (pref, dur, latest = 22 * 60) => {
    let t = Math.max(pref, Math.ceil(nowMin / 15) * 15);
    for (let guard = 0; guard < 50 && t + dur <= latest; guard++) {
      const clash = busy.find(([a, b]) => t < b && t + dur > a);
      if (!clash) { busy.push([t, t + dur]); return fmtTime(t); }
      t = Math.ceil(clash[1] / 15) * 15;
    }
    return null;
  };
  const add = (pref, dur, title, why, latest) => {
    const time = place(pref, dur, latest);
    if (time) ideas.push({ time, title, why });
  };

  // Alergare la câteva zile
  const lastOf = (re) => {
    const fromWorkouts = state.workouts.filter((x) => re.test(x.name)).map((x) => x.date);
    const fromSchedule = Array.from({ length: 7 }, (_, i) => addDays(k, -i - 1)).filter((d) => eventsForDate(d).some((e) => re.test(e.title)));
    return [...fromWorkouts, ...fromSchedule].filter((d) => d < k).sort().pop();
  };
  const daysSince = (d) => (d ? Math.round((new Date(k + "T12:00") - new Date(d + "T12:00")) / 864e5) : 99);
  const reRun = /alerg|run/i;
  const reMove = /sal[aă]|antren|alerg|plimb|sport|înot|inot|bicicl|yoga|crunch/i;
  const hasMove = has(0, 24 * 60, reMove);
  const busyEvening = has(16 * 60, 20 * 60, /engl|germ/i);

  const start = work ? toMin(work.end) + (routine().commute || 0) : 10 * 60;
  if (work && !has(start - 30, start + 150, /mas|prânz|pranz|mânc|manc|cin/i))
    add(start, 30, "🍽️ Prânz după muncă", "după drum", start + 120);

  if (!hasMove) {
    if (!sleepLow && daysSince(lastOf(reRun)) >= 2) add(Math.max(start + 30, 16 * 60), 45, "🏃 Alergare 30–40 min", "ritm rapid, controlat", busyEvening ? 18 * 60 + 30 : 21 * 60);
    else if (w.stepsAvg && w.stepsAvg < STEPS_LOW) add(Math.max(start + 60, 17 * 60), 40, "🚶 Plimbare 40 min", `${w.stepsAvg.toLocaleString("ro-RO")} pași/zi`);
    else if (sleepLow) add(Math.max(start + 60, 17 * 60), 30, "🧘 Mișcare ușoară 30 min", "ai dormit puțin");
    else if (!work) add(11 * 60, 75, gymTitle(), "ești odihnit");
  }

  if (!work && dayOfKey(k) >= 5 && sleepLow && !has(13 * 60, 17 * 60, /somn|odihn/i))
    add(14 * 60 + 30, 30, "💤 Somn de prânz 20–30 min", "recuperezi somnul");

  // Un hobby în timpul liber: întâi provocarea de 30 de zile nebifată azi, apoi pe rând
  if (typeof hobbyById === "function" && !dayLoad(k).heavy) {
    const ch = (state.challenges || []).find((c) => hobbyById(c.hobby) && !(k === todayKey() && c.done.includes(k)));
    // hobby-urile tale (fără sport, care are deja sugestiile lui)
    const mine = (state.myHobbies || []).filter((id) => !["sala", "alergare"].includes(id) && hobbyById(id));
    const rotation = mine.length ? mine : ["js", "germana", "foto", "literatura", "editare", "engleza"];
    const d = new Date(k + "T12:00").getDate();
    const hb = hobbyById(ch ? ch.hobby : rotation[d % rotation.length]);
    const [text, dur] = hb.ideas[d % hb.ideas.length];
    add(start + 30, dur, `${hb.emoji} ${text}`, ch ? "provocarea de 30 de zile 🔥" : `${dur} min`, 21 * 60 + 30);
  }

  if (!has(18 * 60, 21 * 60 + 30, /cin|mas|mânc|manc/i))
    add(19 * 60 + 30, 30, "🍽️ Cină", "cu 2–3 ore înainte de somn", 21 * 60 + 30);

  // Zi plină: o pauză reală, fără ecran
  const load = dayLoad(k);
  if (load.heavy && !load.relax) add(start + 30, 30, "🛋️ Pauză 30 min – fără ecran", "ziua e plină", 21 * 60);

  // Ora de culcare: să dormi destul înainte de munca de a doua zi
  const nextWork = eventsForDate(addDays(k, 1)).find((e) => e.kind === "work");
  const need = sleepLow ? SLEEP_GOAL + 30 : SLEEP_GOAL;
  if (!has(20 * 60, 24 * 60 - 1, /culcare|somn|dorm/i)) {
    let bed;
    let why;
    if (nextWork) {
      const wake = toMin(nextWork.time) - 60;
      bed = Math.min(23 * 60, Math.max(20 * 60 + 30, wake - need + 24 * 60));
      why = `${Math.round((need / 60) * 10) / 10} h somn, trezire ${fmtTime(wake)}`;
    } else {
      bed = sleepLow ? 22 * 60 + 30 : 23 * 60;
      why = sleepLow ? "ai de recuperat somn" : "odihnă pentru mâine";
    }
    if (sleepLow && bed - 30 >= nowMin) ideas.push({ time: fmtTime(bed - 30), title: "📵 Fără ecrane", why: "adormi mai repede" });
    if (bed >= nowMin) ideas.push({ time: fmtTime(bed), title: "😴 Culcare", why });
  }

  return ideas.sort((a, b) => a.time.localeCompare(b.time));
}

// ===== Roata norocului =====
let wheelRot = 0;
let wheelBusy = false;
let wheelResult = null;
let plannerDay = "today";

function drawWheel() {
  const seg = 360 / DAY_PLANS.length;
  $("#wheel").style.background = `conic-gradient(${DAY_PLANS.map((p, i) => `${p.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(",")})`;
  $("#wheel").innerHTML = DAY_PLANS.map((p, i) =>
    `<span style="transform: rotate(${i * seg + seg / 2}deg) translateY(-38%)">${p.emoji}</span>`).join("");
}

function spinWheel() {
  if (wheelBusy) return;
  wheelBusy = true;
  wheelResult = null;
  $("#wheel-result").innerHTML = "";
  wheelRot += 360 * 5 + Math.random() * 360;
  $("#wheel").style.transform = `rotate(${wheelRot}deg)`;
  setTimeout(() => {
    const seg = 360 / DAY_PLANS.length;
    const atTop = (360 - (wheelRot % 360)) % 360; // ce felie a ajuns sub săgeată
    wheelResult = DAY_PLANS[Math.floor(atTop / seg)];
    wheelBusy = false;
    renderPlanner();
  }, 3600);
}

const planHtml = (plan, k, label) => `
  <div class="plan-card" style="--plan:${plan.color}">
    <h4>${plan.emoji} ${plan.name}</h4>
    <ul>${plan.items.map(([t, title]) => `<li><b>${t}</b> ${esc(title)}</li>`).join("")}</ul>
    <button class="btn btn-green" data-apply="${plan.id}" data-date="${k}">✅ ${label}</button>
  </div>`;

$("#planner").addEventListener("click", (e) => {
  const tab = e.target.closest("[data-pday]");
  if (tab) { plannerDay = tab.dataset.pday; wheelResult = null; renderPlanner(); return; }
  if (e.target.closest("#wheel-spin")) return spinWheel();
  const ap = e.target.closest("[data-apply]");
  if (ap) { wheelResult = null; return applyPlan(DAY_PLANS.find((p) => p.id === ap.dataset.apply), ap.dataset.date); }
  const add = e.target.closest("[data-sug]");
  if (add) {
    const [k, time, ...rest] = add.dataset.sug.split("|");
    state.schedule.push({ id: uid(), day: DAYS[dayOfKey(k)], date: k, time, title: rest.join("|") });
    save();
    toast("Adăugat în program 📅");
  }
});

// ===== Randare =====
function renderPlanner() {
  const w = weekStats();
  $("#week-analysis").innerHTML = analysisHtml(w);
  if (wheelBusy) return; // nu redesenăm roata cât se învârte

  const k = plannerDay === "today" ? todayKey() : addDays(todayKey(), 1);
  const dayName = DAYS[dayOfKey(k)];
  const label = plannerDay === "today" ? "azi" : "mâine";
  const weekend = dayOfKey(k) >= 5;
  const ev = eventsForDate(k);

  let html = `<div class="seg pday">
      <button type="button" data-pday="today" class="${plannerDay === "today" ? "sel" : ""}">Azi · ${DAYS[dayOfKey(todayKey())]}</button>
      <button type="button" data-pday="tomorrow" class="${plannerDay === "tomorrow" ? "sel" : ""}">Mâine · ${DAYS[dayOfKey(addDays(todayKey(), 1))]}</button>
    </div>`;

  if (weekend && !ev.length) {
    const rec = recommendedPlan(w);
    html += `<p class="muted">${dayName} nu ai nimic programat. Îți recomand – pentru că ${rec.why}:</p>`;
    html += planHtml(rec.plan, k, `Aplică pentru ${label}`);
    html += `<p class="muted center">…sau lasă norocul să aleagă:</p>
      <div class="wheel-wrap">
        <div class="wheel-pointer">▼</div>
        <div class="wheel" id="wheel"></div>
      </div>
      <button type="button" class="btn btn-orange wheel-btn" id="wheel-spin">🎲 Învârte roata</button>
      <div id="wheel-result">${wheelResult ? planHtml(wheelResult, k, `Aplică pentru ${label}`) : ""}</div>
      <p class="muted small center">${DAY_PLANS.map((p) => `${p.emoji} ${p.name}`).join(" · ")}</p>`;
  } else {
    const ideas = daySuggestions(k, w);
    html += ideas.length
      ? `<p class="muted">Idei pentru ${label} (${dayName}), pe lângă ce ai deja:</p>` + ideas.map((i) => `
        <div class="idea">
          <div class="grow"><b>${i.time}</b> ${esc(i.title)}<small>${esc(i.why)}</small></div>
          <button class="btn btn-ghost" data-sug="${k}|${i.time}|${esc(i.title)}">＋</button>
        </div>`).join("")
      : `<p class="muted">Ziua de ${label} arată bine, nu am ce să adaug. 👌</p>`;
  }
  $("#planner").innerHTML = html;
  if ($("#wheel")) {
    drawWheel();
    $("#wheel").style.transition = "none";
    $("#wheel").style.transform = `rotate(${wheelRot}deg)`;
    void $("#wheel").offsetWidth; // aplică poziția fără animație, apoi reactivează animația
    $("#wheel").style.transition = "";
  }

  $("#hello-name").textContent = state.profile && state.profile.name ? `, ${state.profile.name}` : "";

  // formularul rutinei
  const r = routine();
  const f = $("#routine-form");
  if (!f.contains(document.activeElement)) {
    f.elements.on.checked = r.on;
    f.elements.workStart.value = r.workStart;
    f.elements.workEnd.value = r.workEnd;
    f.elements.meals.value = r.meals;
    f.elements.commute.value = r.commute;
    f.querySelectorAll("[name=rday]").forEach((c) => { c.checked = r.days.includes(+c.value); });
  }
}

renderPlanner();
