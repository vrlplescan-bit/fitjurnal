// ===== FitJurnal – hobby-uri pe categorii, idei practice și provocarea de 30 de zile =====
// Fiecare idee: [text scurt, minute]. „＋” o pune în primul loc liber din program (azi sau mâine).

const HOBBY_CATEGORIES = [
  { id: "arta", name: "🎨 Artă & creativitate", color: "#ff2e93", hobbies: [
    { id: "foto", emoji: "📸", name: "Fotografie portret & evenimente", ideas: [
      ["Ieșire foto 1h – 20 de portrete cu 85mm", 60], ["Exersează lumina naturală: 10 cadre la golden hour", 45],
      ["Fotografiază un eveniment mic din Berlin", 120]] },
    { id: "editare", emoji: "🎨", name: "Editare Lightroom / Photoshop", ideas: [
      ["Editează cele mai bune 10 poze din ultima ieșire", 45], ["Fă un preset propriu în Lightroom", 30],
      ["Retușare portret în Photoshop – 1 poză, curat", 40]] },
    { id: "portofoliu", emoji: "🖼️", name: "Site portofoliu", ideas: [
      ["Adaugă 3 poze noi în portofoliu", 20], ["Scrie textul pentru pagina „Despre mine”", 30]] },
    { id: "vlog", emoji: "🎬", name: "Content – vlog lifestyle", ideas: [
      ["Filmează un clip de 60 de secunde din ziua ta", 30], ["Montează și publică un short", 60],
      ["Scrie 5 idei de clipuri pentru săptămâna viitoare", 15]] },
  ] },
  { id: "tech", name: "💻 Tehnologie", color: "#b388ff", hobbies: [
    { id: "js", emoji: "💻", name: "Web development – JavaScript DOM", ideas: [
      ["30 min DOM: un to-do cu addEventListener", 30], ["Refă o pagină reală doar cu HTML și CSS", 60],
      ["Pune un proiect pe GitHub cu README", 30], ["Rezolvă 3 exerciții JavaScript", 30]] },
    { id: "ai", emoji: "🤖", name: "AI local – agenți Python + Ollama", ideas: [
      ["Adaugă o unealtă nouă agentului tău Python", 60], ["Testează un model nou în Ollama", 30]] },
    { id: "pc", emoji: "🖥️", name: "PC hardware", ideas: [
      ["Curăță și verifică temperaturile unui PC", 45], ["Plănuiește un build pe un buget fix", 30]] },
    { id: "kleinanzeigen", emoji: "📦", name: "Electronice pe Kleinanzeigen", ideas: [
      ["Verifică 3 oferte și compară prețurile", 20], ["Fă poze bune și pune un anunț", 30]] },
  ] },
  { id: "limbi", name: "🗣️ Limbi", color: "#00c6ff", hobbies: [
    { id: "germana", emoji: "🇩🇪", name: "Germană – Goethe B1, apoi B2", ideas: [
      ["20 de cuvinte noi + recapitulare", 20], ["Un text de citit B1 și rezumatul lui", 30],
      ["Un model de examen Goethe B1 – Hören", 40], ["Scrie un e-mail formal (Schreiben B1)", 30]] },
    { id: "engleza", emoji: "🇬🇧", name: "Engleză", ideas: [
      ["Un episod fără subtitrare + 10 expresii noi", 30], ["Vorbește 10 minute singur, înregistrat", 15]] },
  ] },
  { id: "corp", name: "💪 Corp & sănătate", color: "#00e676", hobbies: [
    { id: "sala", emoji: "🏋️", name: "Sală – Crunch Fit Wedding", ideas: [
      ["Antrenament complet 75 min", 75], ["Zi de picioare – fără scuze", 60]] },
    { id: "alergare", emoji: "🏃", name: "Alergare", ideas: [
      ["Alergare 30–40 min, rapid dar controlat", 40], ["5 × 3 min alert / 2 min ușor", 30]] },
    { id: "nutritie", emoji: "🥗", name: "Fitness & nutriție", ideas: [
      ["Gătește pentru 3 zile (meal prep)", 90], ["Planifică mesele pe mâine în FitJurnal", 10]] },
    { id: "skincare", emoji: "🧴", name: "Skincare", ideas: [
      ["Rutina de seară, completă", 10]] },
  ] },
  { id: "cultura", name: "📚 Cultură & minte", color: "#ffe600", hobbies: [
    { id: "literatura", emoji: "📖", name: "Literatură – Dostoievski", ideas: [
      ["30 de pagini, fără telefon", 45], ["Notează 3 idei din ce ai citit", 10]] },
    { id: "istoria-artei", emoji: "🏛️", name: "Istoria artei – Renaștere, Brâncuși", ideas: [
      ["Gemäldegalerie – sala cu Renașterea", 120], ["Un documentar despre Brâncuși", 50]] },
    { id: "istorie", emoji: "⚔️", name: "Istorie antică – Alexandru cel Mare", ideas: [
      ["Neues Museum – antichitate", 120], ["Un capitol sau documentar despre Alexandru cel Mare", 45]] },
    { id: "filozofie", emoji: "🤔", name: "Filozofie – Machiavelli", ideas: [
      ["Un capitol din „Principele” + o notiță", 40]] },
    { id: "mate", emoji: "➗", name: "Matematică – analiză, algebră", ideas: [
      ["3 probleme de analiză, din curiozitate", 30]] },
    { id: "anime", emoji: "🍥", name: "Anime – Jujutsu Kaisen", ideas: [
      ["Un episod, ca recompensă după studiu", 25]] },
  ] },
];

// Activitățile fixe din program contează ca hobby făcut (după ce au trecut)
const KIND_TO_HOBBY = { german: "germana", english: "engleza", gym: "sala", run: "alergare", code: "js" };
// Obiectivele tale: le urmărim mai atent
const GOAL_HOBBIES = { germana: 4, engleza: 5, js: 4, foto: 10, vlog: 10, sala: 4, alergare: 4 }; // zile maxime fără

const allHobbies = () => HOBBY_CATEGORIES.flatMap((c) => c.hobbies.map((h) => ({ ...h, cat: c })));
const hobbyById = (id) => allHobbies().find((h) => h.id === id);
let openHobby = null;

// ===== Ce ai făcut: jurnal + provocări + program trecut =====
function hobbyActivity(days = 14) {
  const today = todayKey();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const since = addDays(today, -(days - 1));
  const act = {};
  const note = (id, date, min) => {
    if (!id || date < since || date > today) return;
    const a = (act[id] = act[id] || { count: 0, minutes: 0, days: new Set(), last: "" });
    if (a.days.has(date) && min === 0) return;
    a.days.add(date);
    a.count++;
    a.minutes += min;
    if (date > a.last) a.last = date;
  };
  (state.hobbyLog || []).forEach((l) => note(l.hobby, l.date, l.min || 0));
  (state.challenges || []).forEach((c) => c.done.forEach((d) => note(c.hobby, d, 0)));
  for (let i = 0; i < days; i++) {
    const k = addDays(today, -i);
    for (const e of eventsForDate(k)) {
      const id = e.hobby || KIND_TO_HOBBY[e.kind];
      if (!id) continue;
      const end = e.end ? toMin(e.end) : toMin(e.time) + 60;
      if (k === today && end > nowMin) continue; // încă n-a avut loc
      note(id, k, end - toMin(e.time));
    }
  }
  for (const a of Object.values(act)) a.days = a.days.size;
  return act;
}

const daysAgo = (k) => (k ? Math.round((new Date(todayKey() + "T12:00") - new Date(k + "T12:00")) / 864e5) : null);

function hobbyReportHtml() {
  const act = hobbyActivity(14);
  const done = Object.entries(act).filter(([id]) => hobbyById(id)).sort((a, b) => b[1].minutes - a[1].minutes || b[1].days - a[1].days);
  // ultima dată pentru obiective, căutând mai departe în urmă
  const longAct = hobbyActivity(60);
  const neglected = Object.entries(GOAL_HOBBIES)
    .map(([id, maxDays]) => ({ h: hobbyById(id), ago: daysAgo((longAct[id] || {}).last), maxDays }))
    .filter((x) => x.h && (x.ago === null || x.ago > x.maxDays))
    .sort((a, b) => (b.ago ?? 999) - (a.ago ?? 999));

  let html = done.length
    ? `<p class="muted small">Ultimele 14 zile (din program și ce ai bifat):</p><div class="hrep">${done.slice(0, 6).map(([id, a]) => {
        const h = hobbyById(id);
        return `<div><span>${h.emoji} ${esc(h.name.split(" – ")[0])}</span><b>${a.minutes ? hm(a.minutes) : `${a.days} ${a.days === 1 ? "zi" : "zile"}`}</b></div>`;
      }).join("")}</div>`
    : `<p class="muted small">Încă nu am ce analiza. Apasă „✅ Am făcut” la un hobby sau bifează o provocare.</p>`;

  if (neglected.length) {
    html += `<p class="muted small" style="margin-top:12px">Lăsate deoparte:</p>` + neglected.slice(0, 3).map(({ h, ago }) => {
      const [text, dur] = h.ideas[0];
      return `<div class="idea neglect">
        <div class="grow"><b>${h.emoji} ${esc(h.name.split(" – ")[0])}</b>
          <small>${ago === null ? "Nu l-ai făcut deloc în ultimele 60 de zile." : `N-ai mai făcut de ${ago} zile.`} Azi: ${esc(text.toLowerCase())}.</small></div>
        <button type="button" class="btn btn-ghost" data-hadd="${h.id}|0|today">＋ Azi</button>
      </div>`;
    }).join("");
  } else if (done.length) {
    html += `<p class="good small" style="margin-top:10px">✅ Ești la zi cu toate obiectivele.</p>`;
  }
  return html;
}

// ===== Provocarea de 30 de zile =====
function challengeInfo(ch) {
  const day = Math.min(30, Math.round((new Date(todayKey() + "T12:00") - new Date(ch.start + "T12:00")) / 864e5) + 1);
  return { day, done: ch.done.length, today: ch.done.includes(todayKey()), finished: day >= 30 };
}

// ===== Acțiuni =====
// Un singur ascultător pentru tot cardul (hobby-uri + provocări)
document.querySelector(".hobbies-card").addEventListener("click", (e) => {
  const head = e.target.closest("[data-hobby]");
  if (head) { openHobby = openHobby === head.dataset.hobby ? null : head.dataset.hobby; return renderHobbies(); }

  const add = e.target.closest("[data-hadd]");
  if (add) {
    const [hid, i, when] = add.dataset.hadd.split("|");
    const [text, dur] = hobbyById(hid).ideas[+i];
    const k = when === "today" ? todayKey() : addDays(todayKey(), 1);
    const time = findFreeSlot(k, dur);
    if (!time) return alert(`Nu mai e loc liber ${when === "today" ? "azi" : "mâine"} pentru ${dur} min.`);
    state.schedule.push({ id: uid(), day: DAYS[dayOfKey(k)], date: k, time, end: fmtTime(toMin(time) + dur), title: `${hobbyById(hid).emoji} ${text}`, hobby: hid });
    save();
    return toast(`Pus în program ${when === "today" ? "azi" : "mâine"} la ${time} 📅`);
  }

  const log = e.target.closest("[data-hlog]");
  if (log) {
    const h = hobbyById(log.dataset.hlog);
    const min = Math.max(5, parseInt(prompt(`Cât timp ai făcut „${h.name.split(" – ")[0]}” azi? (minute)`, "30"), 10) || 0);
    if (!min) return;
    state.hobbyLog = [...(state.hobbyLog || []), { hobby: h.id, date: todayKey(), min }];
    // bifează și provocarea, dacă există
    const ch = (state.challenges || []).find((c) => c.hobby === h.id);
    if (ch && !ch.done.includes(todayKey())) ch.done.push(todayKey());
    save();
    return toast(`✅ ${h.emoji} ${hm(min)} notat`);
  }

  const start = e.target.closest("[data-hstart]");
  if (start) {
    state.challenges = (state.challenges || []).filter((c) => c.hobby !== start.dataset.hstart);
    state.challenges.push({ hobby: start.dataset.hstart, start: todayKey(), done: [] });
    save();
    return toast("🔥 Provocare de 30 de zile pornită. Ziua 1!");
  }

  const check = e.target.closest("[data-hcheck]");
  if (check) {
    const ch = (state.challenges || []).find((c) => c.hobby === check.dataset.hcheck);
    if (ch && !ch.done.includes(todayKey())) { ch.done.push(todayKey()); save(); toast("✅ Bifat. Continuă mâine!"); }
    return;
  }

  const stop = e.target.closest("[data-hstop]");
  if (stop && confirm("Oprești provocarea?")) {
    state.challenges = (state.challenges || []).filter((c) => c.hobby !== stop.dataset.hstop);
    save();
  }
});

// ===== Randare =====
function challengeHtml(ch) {
  const h = hobbyById(ch.hobby);
  if (!h) return "";
  const info = challengeInfo(ch);
  const pct = (info.done / 30) * 100;
  return `<div class="challenge">
    <div class="ch-top"><b>${h.emoji} ${esc(h.name)}</b><span>Ziua ${info.day}/30 · ${info.done} bifate</span></div>
    <div class="ch-bar"><span style="width:${pct}%"></span></div>
    <div class="row wrap">
      ${info.finished
        ? `<p class="muted small">🏁 Gata cele 30 de zile! ${info.done >= 20 ? "Merită păstrat." : "Hotărăște dacă îl continui."}</p>`
        : info.today
          ? `<p class="muted small">✅ Azi e bifat.</p>`
          : `<button class="btn btn-green" data-hcheck="${h.id}">✅ Am făcut azi</button>`}
      <button class="btn btn-ghost" data-hstop="${h.id}">Oprește</button>
    </div>
  </div>`;
}

function renderHobbies() {
  $("#hobby-report").innerHTML = hobbyReportHtml();
  const challenges = (state.challenges || []).filter((c) => hobbyById(c.hobby));
  $("#challenges").innerHTML = challenges.length
    ? challenges.map(challengeHtml).join("")
    : `<p class="muted small">Regula ta: 30 de zile înainte să renunți. Alege un hobby mai jos și apasă „🔥 30 de zile”.</p>`;

  $("#hobbies").innerHTML = HOBBY_CATEGORIES.map((c) => `
    <div class="hcat" style="--hcat:${c.color}">
      <h4>${c.name}</h4>
      ${c.hobbies.map((h) => {
        const open = openHobby === h.id;
        const active = challenges.some((ch) => ch.hobby === h.id);
        return `<div class="hobby ${open ? "open" : ""}">
          <button type="button" class="hobby-head" data-hobby="${h.id}">
            <span>${h.emoji} ${esc(h.name)}${active ? " 🔥" : ""}</span><span class="chev">${open ? "▾" : "▸"}</span>
          </button>
          ${open ? `<div class="hobby-body">
            ${h.ideas.map(([text, dur], i) => `<div class="hidea">
              <span class="grow">${esc(text)} <small>${dur} min</small></span>
              <button type="button" class="btn btn-ghost" data-hadd="${h.id}|${i}|today">＋ Azi</button>
              <button type="button" class="btn btn-ghost" data-hadd="${h.id}|${i}|tomorrow">＋ Mâine</button>
            </div>`).join("")}
            <div class="row wrap">
              <button type="button" class="btn btn-green" data-hlog="${h.id}">✅ Am făcut azi</button>
              ${active ? "" : `<button type="button" class="btn btn-orange" data-hstart="${h.id}">🔥 30 de zile</button>`}
            </div>
          </div>` : ""}
        </div>`;
      }).join("")}
    </div>`).join("");
}

renderHobbies();
