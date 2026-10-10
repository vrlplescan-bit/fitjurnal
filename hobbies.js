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

const allHobbies = () => HOBBY_CATEGORIES.flatMap((c) => c.hobbies.map((h) => ({ ...h, cat: c })));
const hobbyById = (id) => allHobbies().find((h) => h.id === id);
let openHobby = null;

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
            ${active ? "" : `<button type="button" class="btn btn-orange" data-hstart="${h.id}">🔥 30 de zile</button>`}
          </div>` : ""}
        </div>`;
      }).join("")}
    </div>`).join("");
}

renderHobbies();
