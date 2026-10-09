// ===== FitJurnal – obiectivul de calorii crește cu mișcarea =====
// Obiectiv de bază (ex. 3000 kcal) + 200 kcal pentru fiecare 200 kcal active arse.
// Ex.: ai ars 452 kcal → bonus +400 → obiectiv azi 3400 kcal.

const BONUS_STEP = 200;
const STEPS_GOAL = 10000;

const fmtKcal = (n) => Math.round(n).toLocaleString("ro-RO");

function calorieDay(date) {
  const base = state.kcalGoal;
  const burned = burnedOn(date);
  const bonus = Math.floor(burned / BONUS_STEP) * BONUS_STEP;
  const eaten = state.food.filter((f) => f.date === date).reduce((s, f) => s + f.kcal, 0);
  const target = base + bonus;
  return { base, burned, bonus, target, eaten, left: target - eaten, toNext: BONUS_STEP - (burned % BONUS_STEP) };
}

// ===== Anunț la fiecare +200 kcal =====
function notifySystem(body) {
  if (!("Notification" in window) || Notification.permission !== "granted" || !navigator.serviceWorker) return;
  navigator.serviceWorker.ready
    .then((reg) => reg.showNotification("FitJurnal 🔥", { body, icon: "icons/icon-192.png", tag: "bonus" }))
    .catch(() => {});
}

function checkBonusMilestone(c) {
  const day = todayKey();
  state.bonusSeen = state.bonusSeen || {};
  if (c.bonus <= (state.bonusSeen[day] || 0)) return;
  state.bonusSeen[day] = c.bonus;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorăm */ }
  const msg = `Ai ars ${fmtKcal(c.burned)} kcal! +${c.bonus} kcal azi → obiectiv ${fmtKcal(c.target)} kcal.`;
  toast("🔥 " + msg, 4500);
  notifySystem(msg);
}

$("#notify-btn").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("Notificările merg doar cu aplicația instalată pe ecranul principal (iOS 16.4 sau mai nou).");
    return;
  }
  const res = await Notification.requestPermission();
  if (res === "granted") {
    toast("🔔 Notificări activate");
    notifySystem("Te anunț la fiecare 200 kcal arse.");
  }
  renderCalories();
});

// ===== Randare =====
function renderCalories() {
  const c = calorieDay(todayKey());
  const steps = (state.health[todayKey()] || {}).steps || 0;

  // Inel: cât ai mâncat din obiectivul de azi
  const pct = Math.round((c.eaten / c.target) * 100);
  const ring = $("#kcal-ring");
  ring.style.strokeDashoffset = 314 - 314 * Math.min(pct, 100) / 100;
  ring.style.stroke = pct > 100 ? "#ff2e93" : pct > 70 ? "#00e676" : "#ff8a00";
  $("#kcal-pct").textContent = pct + "%";
  $("#kcal-goal-txt").textContent = `din ${fmtKcal(c.target)} kcal`;

  $("#cal-breakdown").innerHTML = `
    <li><span>🎯 Obiectiv de bază</span><b>${fmtKcal(c.base)}</b></li>
    <li class="plus"><span>🔥 Bonus mișcare <small>(ai ars ${fmtKcal(c.burned)} kcal)</small></span><b>+${fmtKcal(c.bonus)}</b></li>
    <li class="total"><span>Obiectiv azi</span><b>${fmtKcal(c.target)}</b></li>
    <li><span>🍽️ Mâncat</span><b>${fmtKcal(c.eaten)}</b></li>
    <li class="${c.left < 0 ? "over" : "left"}"><span>${c.left < 0 ? "Peste obiectiv" : "Mai ai de mâncat"}</span><b>${fmtKcal(Math.abs(c.left))}</b></li>`;

  $("#cal-next").style.width = `${((BONUS_STEP - c.toNext) / BONUS_STEP) * 100}%`;
  $("#cal-next-txt").textContent = `Încă ${fmtKcal(c.toNext)} kcal arse până la următorul +${BONUS_STEP}`;
  $("#cal-steps").textContent = steps
    ? `👟 ${steps.toLocaleString("ro-RO")} pași ${steps >= STEPS_GOAL ? "✅ peste" : "din"} ${STEPS_GOAL.toLocaleString("ro-RO")} (pașii sunt incluși în kcal arse)`
    : "";

  const canAsk = "Notification" in window && Notification.permission === "default";
  $("#notify-btn").hidden = !canAsk;

  // Ecranul Alimentație
  $("#food-bonus").textContent = c.bonus ? `+${fmtKcal(c.bonus)} bonus mișcare = ${fmtKcal(c.target)} azi` : "";

  checkBonusMilestone(c);
}

renderCalories();
