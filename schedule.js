// ===== FitJurnal – programul: activități, săptămâna, reamintiri =====
// O activitate: { id, day, time, end?, title, date?, until?, kind?, routine?, plan? }
//  - fără „date” = se repetă în fiecare săptămână în ziua „day” (până la „until”, dacă există)
//  - cu „date” = doar în acea zi (ex. programul ales cu roata în weekend)
// Reamintiri: în aplicație (cât e deschisă) și în Calendarul iPhone (fișier .ics cu alarme).

const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const dayIdx = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = luni
const dayOfKey = (k) => dayIdx(new Date(k + "T12:00"));
const toMin = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + m; };
const fmtTime = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const addDays = (k, n) => { const d = new Date(k + "T12:00"); d.setDate(d.getDate() + n); return dateKey(d); };
const schedBefore = () => state.schedBefore ?? 30;
const schedEveHour = () => state.schedEveHour ?? 20;
const hm = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}` : `${min} min`);
const timeText = (s) => (s.end ? `${s.time}–${s.end}` : s.time);

function eventsForDate(k) {
  const day = DAYS[dayOfKey(k)];
  return state.schedule
    .filter((s) => (s.date ? s.date === k : s.day === day && (!s.until || k <= s.until)))
    .sort((a, b) => a.time.localeCompare(b.time));
}

// Primul loc liber de „dur” minute într-o zi (după muncă, între 09:00 și 22:00)
function findFreeSlot(k, dur) {
  const ev = eventsForDate(k).map((e) => [toMin(e.time), e.end ? toMin(e.end) : toMin(e.time) + 60]);
  let t = 9 * 60;
  if (k === todayKey()) {
    const now = new Date();
    t = Math.max(t, Math.ceil((now.getHours() * 60 + now.getMinutes() + 10) / 15) * 15);
  }
  for (let guard = 0; guard < 100 && t + dur <= 22 * 60; guard++) {
    const clash = ev.find(([a, b]) => t < b && t + dur > a);
    if (!clash) return fmtTime(t);
    t = Math.ceil(clash[1] / 15) * 15;
  }
  return null;
}

// ===== Adăugare =====
$("#schedule-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const item = { id: uid(), day: d.day, time: d.time, title: d.title.trim() };
  if (d.end && d.end > d.time) item.end = d.end;
  if (d.repeat === "once") {
    // următoarea zi cu acest nume (azi, dacă e azi)
    const i = DAYS.indexOf(d.day);
    item.date = addDays(todayKey(), (i - dayIdx() + 7) % 7);
  }
  state.schedule.push(item);
  e.target.reset();
  save();
  toast("Adăugat în program 📅");
});

// ===== Fișier pentru Calendar (.ics) =====
const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
const icsDate = (k) => k.replace(/-/g, "");

function nextDateFor(i, hhmm) {
  const d = new Date();
  let add = (i - dayIdx(d) + 7) % 7;
  if (add === 0 && toMin(hhmm) <= d.getHours() * 60 + d.getMinutes()) add = 7;
  d.setDate(d.getDate() + add);
  return dateKey(d);
}

function buildIcs(events) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FitJurnal//RO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const s of events) {
    const i = DAYS.indexOf(s.day);
    if (i < 0) continue;
    const start = s.date || nextDateFor(i, s.time);
    const t = s.time.replace(":", "") + "00";
    const dur = s.end ? toMin(s.end) - toMin(s.time) : 60;
    // Alarma de seară: de la ora activității înapoi până la ora X din ziua dinainte
    const eveBefore = toMin(s.time) + (24 - schedEveHour()) * 60;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@fitjurnal`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(start)}T${t}`,
      `DURATION:PT${dur}M`,
      ...(s.date ? [] : [`RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[i]}${s.until ? `;UNTIL=${icsDate(s.until)}T235959` : ""}`]),
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

$("#ics-all").addEventListener("click", () =>
  openIcs(state.schedule.filter((s) => (s.date ? s.date : s.until || "9999") >= todayKey()), "fitjurnal-program.ics"));

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
  for (const [k, t] of Object.entries(state.schedNotified)) if (Date.now() - t > 7 * 864e5) delete state.schedNotified[k];
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorăm */ }
}
const notified = (key) => !!(state.schedNotified || {})[key];

function checkScheduleReminders() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayKey();

  for (const s of eventsForDate(today)) {
    const left = toMin(s.time) - nowMin;
    const key = `${today}|${s.id}|before`;
    if (left > 0 && left <= schedBefore() && !notified(key)) {
      markNotified(key);
      const msg = `Peste ${left} min (${s.time}): ${s.title}`;
      toast("⏰ " + msg, 7000);
      notifySystem(msg, "FitJurnal ⏰");
    }
  }

  const tomorrow = eventsForDate(addDays(today, 1));
  const key = `${today}|eve`;
  if (now.getHours() >= schedEveHour() && tomorrow.length && !notified(key)) {
    markNotified(key);
    const msg = `Mâine ai: ${tomorrow.map((s) => `${timeText(s)} ${s.title}`).join(" · ")}`;
    toast("📅 " + msg, 8000);
    notifySystem(msg, "FitJurnal 📅");
  }
}
setInterval(checkScheduleReminders, 30 * 1000);

// ===== Randare =====
const eventLi = (s, color) => `<li style="--accent:${color}">
  <span class="tag">${esc(timeText(s))}</span><span class="grow">${esc(s.title)}</span></li>`;

function renderSchedule() {
  const today = todayKey();
  // activitățile de o singură zi mai vechi de 2 săptămâni nu mai sunt utile
  const before = state.schedule.length;
  state.schedule = state.schedule.filter((s) => !s.date || s.date >= addDays(today, -14));
  if (state.schedule.length !== before) { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* */ } }

  const tIdx = dayIdx();
  const todays = eventsForDate(today);
  const tomorrows = eventsForDate(addDays(today, 1));
  $("#dash-schedule").innerHTML = todays.length
    ? todays.map((s) => eventLi(s, DAY_COLORS[tIdx])).join("")
    : `<li class="empty" style="border:0">Nimic programat azi (${DAYS[tIdx]}).</li>`;
  $("#dash-tomorrow").innerHTML = tomorrows.length
    ? tomorrows.map((s) => eventLi(s, DAY_COLORS[(tIdx + 1) % 7])).join("")
    : `<li class="empty" style="border:0">Nimic mâine (${DAYS[(tIdx + 1) % 7]}).</li>`;

  // Săptămâna curentă (luni–duminică), cu date
  const monday = addDays(today, -tIdx);
  $("#week-grid").innerHTML = DAYS.map((day, i) => {
    const k = addDays(monday, i);
    const ev = eventsForDate(k);
    return `<div class="day ${i === tIdx ? "today" : ""}" style="--day-color:${DAY_COLORS[i]}">
      <h4>${day} <small>${new Date(k + "T12:00").getDate()}</small></h4>
      ${ev.map((s) => `<div class="event ${s.routine ? "routine" : ""}"><b>${esc(timeText(s))}${s.date ? " · o dată" : s.until ? ` · până pe ${new Date(s.until + "T12:00").toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}` : ""}</b>${esc(s.title)}
        <span class="ev-actions"><button class="ics" data-ics="${s.id}" title="Pune în Calendar">📅</button><button class="del" data-del="schedule:${s.id}">✕</button></span></div>`).join("")}
    </div>`;
  }).join("");

  if (document.activeElement !== $("#sched-before")) $("#sched-before").value = schedBefore();
  if (document.activeElement !== $("#sched-eve")) $("#sched-eve").value = schedEveHour();
  $("#sched-notify").hidden = !("Notification" in window && Notification.permission === "default");
  checkScheduleReminders();
}

renderSchedule();
