// ===== FitJurnal – lista de cumpărături =====
// Se face singură din alimentele favorite și din ce intră în mesele favorite,
// grupată pe raioane. Bifezi ce ai luat; poți adăuga sau scoate produse.
// state.shop = { extra: ["detergent", …], hidden: ["foodId", …], checked: { cheie: true } }

// La magazin cumperi „ouă”, nu „ochiuri” sau „omletă”: formele gătite trimit la produsul de cumpărat
const SHOP_AS = { "ochiuri": "ou-intreg", "omleta": "ou-intreg", "ou-fiert": "ou-intreg", "albus-de-ou": "ou-intreg" };
const SHOP_NAMES = { "ou-intreg": "Ouă" };
// Ordinea raioanelor, ca într-un magazin
const SHOP_ORDER = ["Legume", "Fructe", "Carne", "Pește", "Ouă și lactate", "Pâine și cereale", "Leguminoase",
  "Nuci și semințe", "Sosuri și grăsimi", "Mâncăruri", "Băuturi", "Dulciuri și gustări", "Alimentele mele"];

const shopState = () => {
  state.shop = state.shop || { extra: [], hidden: [], checked: {} };
  return state.shop;
};

function shopItems() {
  const sh = shopState();
  const ids = new Set();
  const addId = (id) => ids.add(SHOP_AS[id] || id);
  (state.favFoods || []).forEach(addId);
  (state.favMeals || []).forEach((m) => m.items.forEach(([id]) => addId(id)));
  const foods = [...ids].filter((id) => !sh.hidden.includes(id)).map(foodById).filter(Boolean)
    .map((f) => ({ key: f.id, name: t(SHOP_NAMES[f.id] || f.name).split(" (")[0], cat: f.cat }));
  const extra = sh.extra.map((name) => ({ key: "x:" + name, name, cat: "Altele", extra: true }));
  return [...foods, ...extra];
}

function shopGroups() {
  const groups = {};
  for (const it of shopItems()) (groups[it.cat] = groups[it.cat] || []).push(it);
  for (const g of Object.values(groups)) g.sort((a, b) => a.name.localeCompare(b.name, LOCALE));
  const rank = (c) => (SHOP_ORDER.indexOf(c) + 1) || 99;
  return Object.entries(groups).sort((a, b) => rank(a[0]) - rank(b[0])).map(([c, items]) => [t(c), items]);
}

$("#shop-box").addEventListener("change", (e) => {
  const cb = e.target.closest("[data-shop]");
  if (!cb) return;
  const sh = shopState();
  if (cb.checked) sh.checked[cb.dataset.shop] = true; else delete sh.checked[cb.dataset.shop];
  save();
});

$("#shop-box").addEventListener("click", (e) => {
  const sh = shopState();
  const rm = e.target.closest("[data-shop-rm]");
  if (rm) {
    const key = rm.dataset.shopRm;
    if (key.startsWith("x:")) sh.extra = sh.extra.filter((n) => "x:" + n !== key);
    else sh.hidden.push(key);
    delete sh.checked[key];
    return save();
  }
  if (e.target.closest("#shop-reset")) { sh.checked = {}; save(); return toast(t("🛒 Lista e gata pentru data viitoare")); }
  if (e.target.closest("#shop-restore")) { sh.hidden = []; save(); return; }
  if (e.target.closest("#shop-share")) return shareShopList();
});

$("#shop-add").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = e.target.elements.item.value.trim();
  if (!name) return;
  const sh = shopState();
  if (!sh.extra.includes(name)) sh.extra.push(name);
  e.target.reset();
  save();
});

// Trimite lista ca text (WhatsApp, Notițe, mesaj…) sau o copiază
async function shareShopList() {
  const sh = shopState();
  const text = `🛒 ${t("Lista de cumpărături")}\n\n` + shopGroups().map(([cat, items]) =>
    `${cat}\n${items.map((it) => `${sh.checked[it.key] ? "☑" : "☐"} ${it.name}`).join("\n")}`).join("\n\n");
  try {
    if (navigator.share) { await navigator.share({ title: t("Lista de cumpărături"), text }); return; }
  } catch (err) {
    if (err.name === "AbortError") return;
  }
  try { await navigator.clipboard.writeText(text); toast(t("📋 Lista a fost copiată")); } catch (err) { alert(text); }
}

function renderShopping() {
  const sh = shopState();
  const groups = shopGroups();
  const total = groups.reduce((n, [, items]) => n + items.length, 0);
  const done = groups.reduce((n, [, items]) => n + items.filter((it) => sh.checked[it.key]).length, 0);
  $("#shop-count").textContent = total ? `${done}/${total}` : "";
  $("#shop-box").innerHTML = (total
    ? groups.map(([cat, items]) => `
      <div class="shop-group">
        <h4>${esc(cat)}</h4>
        ${items.map((it) => `<label class="shop-row ${sh.checked[it.key] ? "done" : ""}">
          <input type="checkbox" data-shop="${esc(it.key)}" ${sh.checked[it.key] ? "checked" : ""}>
          <span class="grow">${esc(it.name)}</span>
          <button type="button" class="del" data-shop-rm="${esc(it.key)}" title="${t("Scoate din listă")}">✕</button>
        </label>`).join("")}
      </div>`).join("")
    : `<p class="muted small">${t("Lista se face singură din alimentele și mesele tale favorite. Poți adăuga și alte produse mai jos.")}</p>`) + `
    <div class="row wrap shop-actions">
      ${done ? `<button type="button" class="btn btn-ghost" id="shop-reset">${t("↺ Resetează bifele")}</button>` : ""}
      ${total ? `<button type="button" class="btn btn-ghost" id="shop-share">${t("📤 Trimite lista")}</button>` : ""}
      ${sh.hidden.length ? `<button type="button" class="link-btn" id="shop-restore">${t("Readu produsele scoase ({n})", { n: sh.hidden.length })}</button>` : ""}
    </div>`;
}

renderShopping();
