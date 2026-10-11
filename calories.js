// ===== FitJurnal – obiectivul de calorii crește cu mișcarea =====
// Obiectiv de bază (ex. 3000 kcal) + 200 kcal pentru fiecare 200 kcal active arse.
// Ex.: ai ars 452 kcal → bonus +400 → obiectiv azi 3400 kcal.

const BONUS_STEP = 200;
const STEPS_GOAL = 10000;

const fmtKcal = (n) => Math.round(n).toLocaleString(LOCALE);

function calorieDay(date) {
  const base = state.kcalGoal;
  const burned = burnedOn(date);
  const bonus = Math.floor(burned / BONUS_STEP) * BONUS_STEP;
  const eaten = state.food.filter((f) => f.date === date).reduce((s, f) => s + f.kcal, 0);
  const target = base + bonus;
  return { base, burned, bonus, target, eaten, left: target - eaten, toNext: BONUS_STEP - (burned % BONUS_STEP) };
}

// ===== Anunț la fiecare +200 kcal =====
function notifySystem(body, title = "FitJurnal 🔥") {
  if (!("Notification" in window) || Notification.permission !== "granted" || !navigator.serviceWorker) return;
  navigator.serviceWorker.ready
    .then((reg) => reg.showNotification(title, { body, icon: "icons/icon-192.png", tag: title }))
    .catch(() => {});
}

function checkBonusMilestone(c) {
  const day = todayKey();
  state.bonusSeen = state.bonusSeen || {};
  if (c.bonus <= (state.bonusSeen[day] || 0)) return;
  state.bonusSeen[day] = c.bonus;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorăm */ }
  const msg = t("Ai ars {b} kcal! +{x} kcal azi → obiectiv {g} kcal.", { b: fmtKcal(c.burned), x: c.bonus, g: fmtKcal(c.target) });
  toast("🔥 " + msg, 4500);
  notifySystem(msg);
}

$("#notify-btn").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert(t("Notificările merg doar cu aplicația instalată pe ecranul principal (iOS 16.4 sau mai nou)."));
    return;
  }
  const res = await Notification.requestPermission();
  if (res === "granted") {
    toast(t("🔔 Notificări activate"));
    notifySystem(t("Te anunț la fiecare 200 kcal arse."));
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
  $("#kcal-goal-txt").textContent = t("din {n} kcal", { n: fmtKcal(c.target) });

  $("#cal-breakdown").innerHTML = `
    <li><span>${t("🎯 Obiectiv de bază")}</span><b>${fmtKcal(c.base)}</b></li>
    <li class="plus"><span>${t("🔥 Bonus mișcare")} <small>${t("(ai ars {n} kcal)", { n: fmtKcal(c.burned) })}</small></span><b>+${fmtKcal(c.bonus)}</b></li>
    <li class="total"><span>${t("Obiectiv azi")}</span><b>${fmtKcal(c.target)}</b></li>
    <li><span>${t("🍽️ Mâncat")}</span><b>${fmtKcal(c.eaten)}</b></li>
    <li class="${c.left < 0 ? "over" : "left"}"><span>${c.left < 0 ? t("Peste obiectiv") : t("Mai ai de mâncat")}</span><b>${fmtKcal(Math.abs(c.left))}</b></li>`;

  $("#cal-next").style.width = `${((BONUS_STEP - c.toNext) / BONUS_STEP) * 100}%`;
  $("#cal-next-txt").textContent = t("Încă {n} kcal arse până la următorul +{s}", { n: fmtKcal(c.toNext), s: BONUS_STEP });
  $("#cal-steps").textContent = steps
    ? t(steps >= STEPS_GOAL ? "👟 {n} pași ✅ peste {g} (pașii sunt incluși în kcal arse)" : "👟 {n} pași din {g} (pașii sunt incluși în kcal arse)", { n: steps.toLocaleString(LOCALE), g: STEPS_GOAL.toLocaleString(LOCALE) })
    : "";

  const canAsk = "Notification" in window && Notification.permission === "default";
  $("#notify-btn").hidden = !canAsk;

  // Ecranul Alimentație
  $("#food-bonus").textContent = c.bonus ? t("+{b} bonus mișcare = {g} azi", { b: fmtKcal(c.bonus), g: fmtKcal(c.target) }) : "";

  checkBonusMilestone(c);
}

renderCalories();
