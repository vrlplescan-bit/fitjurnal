// ===== FitJurnal – planificator: rutina de lucru, analiza săptămânii, sugestii, roata norocului =====

const SLEEP_GOAL = 8 * 60; // minute; adulții au nevoie de 7–9 ore
const SLEEP_LOW = 6.5 * 60;
const STEPS_LOW = 6000;

// ===== Rutina zilelor lucrătoare =====
const DEFAULT_ROUTINE = { on: true, workStart: "07:00", workEnd: "15:00", meals: "10:30", days: [0, 1, 2, 3, 4] };
const routine = () => ({ ...DEFAULT_ROUTINE, ...(state.routine || {}) });

function applyRoutine() {
  const r = routine();
  state.schedule = state.schedule.filter((s) => !s.routine);
  if (r.on) {
    const meals = String(r.meals).split(/[,\s]+/).filter((t) => /^\d{1,2}:\d{2}$/.test(t)).map((t) => t.padStart(5, "0"));
    for (const i of r.days) {
      state.schedule.push({ id: `r-work-${i}`, day: DAYS[i], time: r.workStart, end: r.workEnd, title: "💼 Muncă", kind: "work", routine: true });
      meals.forEach((t, j) => state.schedule.push({ id: `r-meal-${i}-${j}`, day: DAYS[i], time: t, title: "🍽️ Masă", kind: "meal", routine: true }));
    }
  }
  state.routineApplied = true;
}

// Prima pornire: rutina implicită (luni–vineri 07:00–15:00, masă la 10:30)
if (!state.routineApplied) {
  applyRoutine();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorăm */ }
}

$("#routine-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  if (d.workEnd <= d.workStart) return alert("Ora de terminare trebuie să fie după ora de început.");
  state.routine = { ...routine(), on: !!d.on, workStart: d.workStart, workEnd: d.workEnd, meals: d.meals };
  applyRoutine();
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
];

function recommendedPlan(w) {
  if (w.nights && w.sleepAvg < SLEEP_LOW) return { plan: DAY_PLANS[1], why: `ai dormit în medie doar ${fmtSleep(w.sleepAvg)} pe noapte` };
  if (w.stepsAvg && w.stepsAvg < STEPS_LOW) return { plan: DAY_PLANS[0], why: `te-ai mișcat puțin (${w.stepsAvg.toLocaleString("ro-RO")} pași/zi)` };
  if (w.nights) return { plan: DAY_PLANS[2], why: "ai dormit bine și te-ai mișcat – o zi afară îți face bine" };
  return { plan: DAY_PLANS[2], why: "o zi afară e mereu o alegere bună" };
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
  const isPast = (t) => k === todayKey() && toMin(t) <= new Date().getHours() * 60 + new Date().getMinutes();
  const has = (from, to, re) => ev.some((e) => toMin(e.time) >= from && toMin(e.time) <= to && re.test(e.title));
  const ideas = [];
  const work = ev.find((e) => e.kind === "work" && e.end);
  const h = state.health[todayKey()] || {};
  const lastNight = k === todayKey() ? h.sleepMin : 0;
  const sleepLow = (w.nights && w.sleepAvg < SLEEP_LOW) || (lastNight && lastNight < SLEEP_LOW);

  if (work) {
    const after = toMin(work.end);
    if (!has(after, after + 150, /mas|prânz|pranz|mânc|manc|cin/i))
      ideas.push({ time: fmtTime(after + 30), title: "🍽️ Prânz după muncă", why: "o masă bună după program" });
    if (!has(after + 60, 21 * 60, /sal|antren|alerg|plimb|sport|înot|inot|bicicl|yoga/i)) {
      const t = fmtTime(Math.max(after + 120, 17 * 60));
      ideas.push(w.stepsAvg && w.stepsAvg < STEPS_LOW
        ? { time: t, title: "🚶 Plimbare 40 min", why: `media ta e ${w.stepsAvg.toLocaleString("ro-RO")} pași/zi` }
        : sleepLow
          ? { time: t, title: "🧘 Mișcare ușoară 30 min", why: "ai dormit puțin – nimic prea solicitant" }
          : { time: t, title: "🏋️ Antrenament 45–60 min", why: "ai energie după o săptămână cu somn bun" });
    }
  } else if (dayOfKey(k) >= 5) {
    if (sleepLow && !has(13 * 60, 17 * 60, /somn|odihn|pui de somn/i))
      ideas.push({ time: "14:30", title: "💤 Somn de prânz 20–30 min", why: "recuperezi din somnul pierdut" });
    if (w.stepsAvg && w.stepsAvg < STEPS_LOW && !has(9 * 60, 20 * 60, /plimb|alerg|drume|sport|bicicl/i))
      ideas.push({ time: "11:00", title: "🚶 Plimbare lungă 60 min", why: `media ta e ${w.stepsAvg.toLocaleString("ro-RO")} pași/zi` });
  }

  if (!has(18 * 60, 21 * 60 + 30, /cin|mas|mânc|manc/i))
    ideas.push({ time: "19:30", title: "🍽️ Cină", why: "ultima masă cu 2–3 ore înainte de culcare" });

  // Ora de culcare: să dormi destul înainte de munca de a doua zi
  const nextWork = eventsForDate(addDays(k, 1)).find((e) => e.kind === "work");
  const need = sleepLow ? SLEEP_GOAL + 30 : SLEEP_GOAL;
  if (!has(20 * 60, 24 * 60 - 1, /culcare|somn|dorm/i)) {
    if (nextWork) {
      const wake = toMin(nextWork.time) - 60;
      const bed = Math.min(23 * 60, Math.max(20 * 60 + 30, wake - need + 24 * 60));
      ideas.push({ time: fmtTime(bed), title: "😴 Culcare", why: `ca să dormi ~${Math.round(need / 60 * 10) / 10} ore înainte de trezirea de la ${fmtTime(wake)}` });
    } else {
      ideas.push({ time: sleepLow ? "22:30" : "23:00", title: "😴 Culcare", why: sleepLow ? "ai de recuperat somn" : "un somn bun pentru mâine" });
    }
    if (sleepLow) {
      const bedIdea = ideas[ideas.length - 1];
      ideas.push({ time: fmtTime(toMin(bedIdea.time) - 30), title: "📵 Fără ecrane", why: "adormi mai repede și dormi mai profund" });
    }
  }
  return ideas.filter((i) => !isPast(i.time)).sort((a, b) => a.time.localeCompare(b.time));
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

  // formularul rutinei
  const r = routine();
  const f = $("#routine-form");
  if (!f.contains(document.activeElement)) {
    f.elements.on.checked = r.on;
    f.elements.workStart.value = r.workStart;
    f.elements.workEnd.value = r.workEnd;
    f.elements.meals.value = r.meals;
  }
}

renderPlanner();
