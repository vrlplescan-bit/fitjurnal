// ===== FitJurnal – limbi: română, engleză, germană =====
// Textele sunt scrise în română în cod; TR le traduce în engleză și germană.
// t("Text românesc", { n: 5 }) → textul în limba aleasă, cu {n} înlocuit.
// Dacă lipsește o traducere, rămâne textul în română (nimic nu apare gol).

const UI_LANGS = [["ro", "🇷🇴", "Română"], ["en", "🇬🇧", "English"], ["de", "🇩🇪", "Deutsch"]];

const LANG = (() => {
  try {
    const saved = localStorage.getItem("fitjurnal-lang");
    if (saved) return saved;
    // cine are deja date rămâne pe română; un utilizator nou primește limba telefonului
    if (localStorage.getItem("fitjurnal-v1")) return "ro";
  } catch (e) { /* ignorăm */ }
  const n = (navigator.language || "ro").slice(0, 2).toLowerCase();
  return ["ro", "en", "de"].includes(n) ? n : "ro";
})();
const LOCALE = { ro: "ro-RO", en: "en-GB", de: "de-DE" }[LANG] || "ro-RO";
document.documentElement.lang = LANG;

// Dicționarul: „text în română”: ["engleză", "germană"]
const TR = {};
function addTr(table) { Object.assign(TR, table); }

function t(s, vars) {
  let out = s;
  if (LANG !== "ro" && TR[s]) out = TR[s][LANG === "en" ? 0 : 1] || s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return out;
}

function setLang(lang) {
  try { localStorage.setItem("fitjurnal-lang", lang); } catch (e) { /* ignorăm */ }
  location.reload();
}

// Traduce textele fixe din pagină (index.html) o singură dată, la pornire
function translateDom(root) {
  if (LANG === "ro") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const raw = n.nodeValue;
    const key = raw.trim().replace(/\s+/g, " ");
    if (key && TR[key]) n.nodeValue = raw.replace(raw.trim(), t(key));
  }
  root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => {
    for (const a of ["placeholder", "title", "aria-label"]) {
      const v = el.getAttribute(a);
      if (v && TR[v.trim()]) el.setAttribute(a, t(v.trim()));
    }
  });
  const title = document.querySelector("title");
  if (title && TR[title.textContent]) title.textContent = t(title.textContent);
}
