// ===== FitJurnal – timpul petrecut pe telefon =====
// Apple nu lasă aplicațiile să citească automat „Timpul de utilizare”, așa că
// îl copiezi din Configurări → Timp de utilizare. Aplicația îl analizează.

const SCREEN_GOAL = () => state.screenGoal ?? 180; // minute pe zi
const APP_GROUPS = [
  { name: "rețele sociale", re: /insta|tiktok|facebook|snap|twitter|^x$|reddit|threads|bereal|pinterest/i },
  { name: "video", re: /youtube|netflix|crunchy|twitch|prime|disney|hbo|max/i },
  { name: "mesaje", re: /whatsapp|telegram|messenger|imessage|mesaje|discord|signal/i },
  { name: "util", re: /duolingo|anki|vs ?code|github|lightroom|photoshop|notion|kindle|cărți|books|safari|chrome|fitjurnal|claude|chatgpt/i },
];

// „4h 10m”, „4h10”, „4:10”, „1 h 20 min”, „50m”, „250” → minute
function parseDuration(txt) {
  const s = String(txt).toLowerCase().replace(",", ".");
  const colon = s.match(/(\d+):(\d{1,2})/);
  if (colon) return +colon[1] * 60 + +colon[2];
  const h = s.match(/(\d+(?:\.\d+)?)\s*h(?:\D{0,5}(\d+))?/); // „1h20”, „1 h 20 min”, „2.5h”
  const m = s.match(/(\d+)\s*m/);
  if (h) return Math.round(parseFloat(h[1]) * 60 + (h[2] ? +h[2] : 0));
  if (m) return +m[1];
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : Math.round(n);
}

function parseApps(txt) {
  return String(txt).split(/\n|;|,(?=\s*[^\d\s])/).map((line) => {
    const i = line.search(/\d/);
    if (i <= 0) return null;
    const name = line.slice(0, i).replace(/[-:–]+\s*$/, "").trim();
    const min = parseDuration(line.slice(i));
    return name && min ? { name, min } : null;
  }).filter(Boolean);
}

$("#screen-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const total = parseDuration(d.total);
  if (!total) return alert(t("Scrie timpul total, de exemplu 4h 10m."));
  state.screen = state.screen || {};
  state.screen[d.date || todayKey()] = { total, apps: parseApps(d.apps) };
  e.target.reset();
  save();
  toast(t("📱 Timp pe telefon salvat"));
});

$("#screen-goal").addEventListener("change", (e) => {
  state.screenGoal = Math.max(30, parseDuration(e.target.value) || 180);
  save();
});

function screenStats(fromDaysAgo, days = 7) {
  const entries = Array.from({ length: days }, (_, i) => addDays(todayKey(), -(fromDaysAgo + i)))
    .map((k) => (state.screen || {})[k]).filter(Boolean);
  const apps = {};
  entries.forEach((en) => en.apps.forEach((a) => { apps[a.name] = (apps[a.name] || 0) + a.min; }));
  const avg = entries.length ? Math.round(entries.reduce((a, en) => a + en.total, 0) / entries.length) : 0;
  const top = Object.entries(apps).sort((a, b) => b[1] - a[1]).map(([name, min]) => ({ name, perDay: Math.round(min / entries.length) }));
  const groups = {};
  top.forEach((a) => { const g = APP_GROUPS.find((x) => x.re.test(a.name)); if (g) groups[g.name] = (groups[g.name] || 0) + a.perDay; });
  return { n: entries.length, avg, top, groups, over: entries.filter((en) => en.total > SCREEN_GOAL()).length };
}

function renderScreen() {
  const s = screenStats(0);
  const prev = screenStats(7);
  const goal = SCREEN_GOAL();
  const out = [];
  if (!s.n) {
    out.push(`<p class="muted small">${t("Încă nu ai notat nimic. Deschide <b>Configurări → Timp de utilizare</b>, copiază totalul de azi (sau de ieri) și primele 3 aplicații.")}</p>`);
  } else {
    out.push(s.avg > goal
      ? `<p class="warn">${t("📱 Media: <b>{a}/zi</b> pe telefon – ~{w}h pe săptămână. Peste ținta ta de {g}.", { a: hm(s.avg), w: Math.round((s.avg * 7) / 60), g: hm(goal) })}</p>`
      : `<p class="good">${t("✅ Media: <b>{a}/zi</b> – sub ținta de {g}. Bravo.", { a: hm(s.avg), g: hm(goal) })}</p>`);
    if (prev.n) {
      const diff = s.avg - prev.avg;
      if (Math.abs(diff) >= 15) out.push(`<p class="muted small">${t(diff > 0 ? "📈 {n}/zi mai mult decât săptămâna trecută." : "📉 {n}/zi mai puțin decât săptămâna trecută.", { n: hm(Math.abs(diff)) })}</p>`);
    }
    if (s.top.length) {
      const top = s.top[0];
      out.push(`<p>${t("Cel mai mult: <b>{app}</b> ({n}/zi).", { app: esc(top.name), n: hm(top.perDay) })}${top.perDay >= 45 ? " " + t("Mută 30 min de acolo pe un obiectiv al tău = 3,5h în plus pe săptămână.") : ""}</p>`);
      out.push(`<div class="hrep">${s.top.slice(0, 5).map((a) => `<div><span>${esc(a.name)}</span><b>${hm(a.perDay)}${t("/zi")}</b></div>`).join("")}</div>`);
    }
    const fun = (s.groups["rețele sociale"] || 0) + (s.groups.video || 0);
    if (fun >= 120) out.push(`<p class="muted small">${t("💡 Pune o limită: Configurări → Timp de utilizare → Limite aplicații → rețele sociale 1h/zi.")}</p>`);
    const sleep = (state.health[todayKey()] || {}).sleepMin;
    if (sleep && sleep < 6.5 * 60 && s.avg > goal) out.push(`<p class="muted small">${t("😴 Dormi puțin și stai mult pe telefon. Lasă telefonul din mână la 22:00.")}</p>`);
  }
  $("#screen-analysis").innerHTML = out.join("");
  if (document.activeElement !== $("#screen-goal")) $("#screen-goal").value = hm(goal);
  const dateInput = $("#screen-form").elements.date;
  if (!dateInput.value) dateInput.value = todayKey();
  dateInput.max = todayKey();
}

renderScreen();
