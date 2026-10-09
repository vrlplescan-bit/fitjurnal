// ===== FitJurnal – reamintiri pentru program =====
// 1. Calendarul iPhone: exportă activitățile ca fișier .ics, cu două alarme fiecare
//    (cu X minute înainte și seara dinainte). Le dă telefonul, chiar cu aplicația închisă.
// 2. În aplicație: aceleași anunțuri cât timp FitJurnal e deschisă.

const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const dayIdx = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = luni
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const schedBefore = () => state.schedBefore ?? 30;
const schedEveHour = () => state.schedEveHour ?? 20;

function eventsOn(i) {
  return state.schedule.filter((s) => s.day === DAYS[i]).sort((a, b) => a.time.localeCompare(b.time));
}

// ===== Fișier pentru Calendar (.ics) =====
const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
const icsDate = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

function nextDateFor(i, hhmm) {
  const d = new Date();
  let add = (i - dayIdx(d) + 7) % 7;
  if (add === 0 && toMin(hhmm) <= d.getHours() * 60 + d.getMinutes()) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

function buildIcs(events) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FitJurnal//RO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const s of events) {
    const i = DAYS.indexOf(s.day);
    if (i < 0) continue;
    const start = nextDateFor(i, s.time);
    const t = s.time.replace(":", "") + "00";
    // Alarma de seara: de la ora activității înapoi până la ora X din ziua dinainte
    const eveBefore = toMin(s.time) + (24 - schedEveHour()) * 60;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@fitjurnal`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(start)}T${t}`,
      "DURATION:PT1H",
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[i]}`,
      `SUMMARY:${icsText(s.title)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`Peste ${schedBefore()} de minute: ${s.title}`)}`,
      `TRIGGER:-PT${schedBefore()}M`, "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`Mâine la ${s.time}: ${s.title}`)}`,
      `TRIGGER:-PT${eveBefore}M`, "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n");
}

// Formatul de calendar cere rânduri de cel mult 75 de octeți; restul continuă pe rândul următor
function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (parts.length ? 74 : 75)) { parts.push(cur); cur = ""; }
    cur += ch;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

function openIcs(events, name) {
  if (!events.length) return alert("Nu ai nimic în program.");
  const file = new File([buildIcs(events)], name, { type: "text/calendar" });
  const url = URL.createObjectURL(file);
  // iPhone deschide fișierul și întreabă „Adaugă în Calendar”
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

$("#ics-all").addEventListener("click", () => openIcs(state.schedule, "fitjurnal-program.ics"));

$("#week-grid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ics]");
  if (!b) return;
  const s = state.schedule.find((x) => x.id === b.dataset.ics);
  if (s) openIcs([s], `fitjurnal-${slug(s.title) || "activitate"}.ics`);
});

$("#sched-before").addEventListener("change", (e) => {
  state.schedBefore = Math.min(240, Math.max(5, parseInt(e.target.value, 10) || 30));
  save();
});
$("#sched-eve").addEventListener("change", (e) => {
  const h = parseInt(e.target.value, 10);
  state.schedEveHour = Number.isNaN(h) ? 20 : Math.min(23, Math.max(12, h));
  save();
});
$("#sched-notify").addEventListener("click", async () => {
  if (!("Notification" in window)) return alert("Notificările merg doar cu aplicația instalată pe ecranul principal.");
  if ((await Notification.requestPermission()) === "granted") toast("🔔 Notificări activate");
  renderSchedule();
});

// ===== Anunțuri în aplicație =====
function markNotified(key) {
  state.schedNotified = state.schedNotified || {};
  state.schedNotified[key] = Date.now();
  // păstrăm doar ultima săptămână
  for (const [k, t] of Object.entries(state.schedNotified)) if (Date.now() - t > 7 * 864e5) delete state.schedNotified[k];
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorăm */ }
}
const notified = (key) => !!(state.schedNotified || {})[key];

function checkScheduleReminders() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayKey();

  // Cu X minute înainte
  for (const s of eventsOn(dayIdx(now))) {
    const left = toMin(s.time) - nowMin;
    const key = `${today}|${s.id}|before`;
    if (left > 0 && left <= schedBefore() && !notified(key)) {
      markNotified(key);
      const msg = `Peste ${left} min (${s.time}): ${s.title}`;
      toast("⏰ " + msg, 7000);
      notifySystem(msg, "FitJurnal ⏰");
    }
  }

  // Seara: ce ai mâine
  const tomorrow = eventsOn((dayIdx(now) + 1) % 7);
  const key = `${today}|eve`;
  if (now.getHours() >= schedEveHour() && tomorrow.length && !notified(key)) {
    markNotified(key);
    const msg = `Mâine ai: ${tomorrow.map((s) => `${s.time} ${s.title}`).join(" · ")}`;
    toast("📅 " + msg, 8000);
    notifySystem(msg, "FitJurnal 📅");
  }
}
setInterval(checkScheduleReminders, 30 * 1000);

// ===== Randare =====
function renderSchedule() {
  const tIdx = (dayIdx() + 1) % 7;
  const tomorrow = eventsOn(tIdx);
  $("#dash-tomorrow").innerHTML = tomorrow.length
    ? tomorrow.map((s) => `<li style="--accent:${DAY_COLORS[tIdx]}">
        <span class="tag">${esc(s.time)}</span><span class="grow">${esc(s.title)}</span></li>`).join("")
    : `<li class="empty" style="border:0">Nimic mâine (${DAYS[tIdx]}).</li>`;

  if (document.activeElement !== $("#sched-before")) $("#sched-before").value = schedBefore();
  if (document.activeElement !== $("#sched-eve")) $("#sched-eve").value = schedEveHour();
  $("#sched-notify").hidden = !("Notification" in window && Notification.permission === "default");
  checkScheduleReminders();
}

renderSchedule();
