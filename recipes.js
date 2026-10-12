// ===== FitJurnal – rețete =====
// Rețete ușoare, cu multe calorii și fără zahăr adăugat, plus mesele tale favorite.
// Ingredientele sunt alimente din baza de date: [foodId, grame]. Kcal și proteinele se calculează singure.
// Rețetele în care ai deja (aproape) toate ingredientele printre favorite vin primele.

const RECIPES = [
  { id: "shake-masa", emoji: "🥤", name: "Shake de masă cu banană și unt de arahide", min: 3, meal: "Gustare",
    items: [["lapte-3-5", 400], ["banana", 118], ["fulgi-de-ovaz", 60], ["unt-de-arahide", 32], ["proteina-whey-pudra", 30]],
    steps: ["Pune totul în blender.", "Mixează 30–40 de secunde până e cremos.", "Bea-l imediat sau ia-l la tine la sală."] },
  { id: "ovaz-noapte", emoji: "🥣", name: "Ovăz peste noapte cu unt de arahide", min: 5, meal: "Mic dejun",
    items: [["fulgi-de-ovaz", 80], ["lapte-3-5", 250], ["unt-de-arahide", 32], ["banana", 118], ["seminte-de-chia", 10]],
    steps: ["Amestecă ovăzul, laptele și semințele de chia într-un borcan.", "Lasă-l în frigider peste noapte.", "Dimineața adaugă banana feliată și untul de arahide."] },
  { id: "paste-ton", emoji: "🍝", name: "Paste cu ton și porumb", min: 15, meal: "Prânz",
    items: [["paste-fierte", 250], ["ton-in-ulei-conserva-scurs", 120], ["porumb-dulce-conserva", 80], ["ulei-de-masline", 10], ["parmezan", 15]],
    steps: ["Fierbe pastele (cca 90 g crude) după instrucțiunile de pe pachet.", "Scurge tonul și porumbul.", "Amestecă totul cu uleiul și presară parmezan."] },
  { id: "bowl-pui", emoji: "🍚", name: "Bol cu orez, pui și avocado", min: 20, meal: "Prânz",
    items: [["orez-alb-fiert", 250], ["piept-de-pui-gatit", 150], ["avocado", 75], ["ulei-de-masline", 10], ["rosii", 123]],
    steps: ["Fierbe orezul (cca 85 g crud).", "Taie pieptul de pui fâșii și rumenește-l în ulei, cu sare și boia.", "Pune în bol orezul, puiul, avocado și roșia tăiate."] },
  { id: "wrap-pui", emoji: "🌯", name: "Wrap cu pui, cașcaval și hummus", min: 10, meal: "Cină",
    items: [["lipie-tortilla", 120], ["piept-de-pui-gatit", 120], ["cascaval", 40], ["hummus", 50], ["rosii", 60]],
    steps: ["Unge lipiile cu hummus.", "Pune puiul, cașcavalul și roșia.", "Rulează-le și încălzește-le 1–2 minute în tigaie."] },
  { id: "cartofi-ochiuri", emoji: "🥔", name: "Cartofi la cuptor cu ochiuri și bacon", min: 35, meal: "Cină",
    items: [["cartofi-la-cuptor", 350], ["ochiuri", 100], ["bacon", 30], ["ulei-de-masline", 10]],
    steps: ["Taie cartofii felii, unge-i cu ulei și coace-i 30 de minute la 200 °C.", "Între timp prăjește baconul.", "Fă două ochiuri în aceeași tigaie și pune-le peste cartofi."] },
  { id: "iaurt-musli", emoji: "🥛", name: "Iaurt grecesc cu musli și nuci", min: 2, meal: "Gustare",
    items: [["iaurt-grecesc-10", 200], ["musli", 60], ["nuci", 30], ["afine", 50]],
    steps: ["Pune iaurtul într-un bol.", "Adaugă musli, nucile și afinele."] },
  { id: "toast-avocado", emoji: "🥑", name: "Pâine prăjită cu avocado și ou fiert", min: 12, meal: "Mic dejun",
    items: [["paine-integrala", 70], ["avocado", 75], ["ou-fiert", 106], ["ulei-de-masline", 5]],
    steps: ["Fierbe ouăle 9 minute.", "Prăjește pâinea și zdrobește avocado cu sare și puțin ulei.", "Întinde avocado pe pâine și pune ouăle feliate deasupra."] },
  { id: "mamaliga-branza", emoji: "🌽", name: "Mămăligă cu brânză, smântână și ou", min: 20, meal: "Cină",
    items: [["mamaliga", 300], ["telemea-de-vaca", 60], ["smantana-20", 50], ["ochiuri", 50]],
    steps: ["Fierbe mălaiul (cca 70 g) în apă cu sare, amestecând, 10–15 minute.", "Fă un ochi în tigaie.", "Servește mămăliga cu brânză, smântână și oul deasupra."] },
  { id: "chili", emoji: "🌶️", name: "Chili cu carne tocată și orez", min: 25, meal: "Prânz",
    items: [["carne-tocata-de-vita-gatita", 150], ["fasole-boabe-fiarta", 150], ["sos-de-rosii-pasata", 100], ["ceapa", 55], ["orez-alb-fiert", 200]],
    steps: ["Călește ceapa, apoi rumenește carnea tocată.", "Adaugă fasolea și pasata, sare, boia și chimion; fierbe 10 minute.", "Servește cu orez."] },
  { id: "somon-cartof-dulce", emoji: "🐟", name: "Somon cu cartof dulce și broccoli", min: 30, meal: "Cină",
    items: [["somon-gatit", 150], ["cartof-dulce-copt", 180], ["broccoli", 100], ["ulei-de-masline", 10]],
    steps: ["Coace cartoful dulce tăiat cuburi 25 de minute la 200 °C.", "Pune somonul și broccoli pe aceeași tavă în ultimele 12–15 minute.", "Stropește cu ulei și lămâie."] },
  { id: "sandvis-arahide", emoji: "🥪", name: "Sandviș cu unt de arahide și banană", min: 3, meal: "Gustare",
    items: [["paine-integrala", 70], ["unt-de-arahide", 32], ["banana", 118]],
    steps: ["Unge feliile de pâine cu unt de arahide.", "Pune banana feliată între ele."] },
];

let openRecipe = null;

const recipeTotals = (r) => mealTotals(r);
// Câte ingrediente ai deja printre favorite (formele de ou contează toate ca „ouă”)
function recipeHave(r) {
  const base = (id) => SHOP_AS[id] || id;
  const fav = new Set((state.favFoods || []).map(base));
  (state.favMeals || []).forEach((m) => m.items.forEach(([id]) => fav.add(base(id))));
  return { have: r.items.filter(([id]) => fav.has(base(id))).length, total: r.items.length };
}

function recipeList() {
  const mine = (state.favMeals || []).map((m, i) => ({ id: "fav:" + i, emoji: "⭐", name: m.name, meal: m.meal, items: m.items, mine: true, favIndex: i }));
  const built = RECIPES.filter((r) => r.items.every(([id]) => foodById(id)))
    .filter((r) => !(state.noSugar && r.items.some(([id]) => isSweet(foodById(id)))))
    .map((r) => ({ ...r, ...recipeHave(r) }))
    .sort((a, b) => b.have / b.total - a.have / a.total || recipeTotals(b).kcal - recipeTotals(a).kcal);
  return { mine, built };
}

function recipeCard(r) {
  const tot = recipeTotals(r);
  const open = openRecipe === r.id;
  const savedFav = !r.mine && (state.favMeals || []).some((m) => m.name === r.name);
  return `<div class="recipe ${open ? "open" : ""}">
    <button type="button" class="recipe-head" data-recipe="${esc(r.id)}">
      <span class="recipe-emoji">${r.emoji}</span>
      <span class="grow"><b>${esc(t(r.name))}</b>
        <small>${tot.kcal} kcal · ${tot.protein} g ${t("proteine")}${r.min ? ` · ⏱ ${r.min} min` : ""}${r.total ? ` · ${r.have === r.total ? t("✅ ai tot") : t("ai {a}/{b}", { a: r.have, b: r.total })}` : ""}</small></span>
      <span class="recipe-arrow">${open ? "▾" : "▸"}</span>
    </button>
    ${open ? `<div class="recipe-body">
      <ul class="recipe-ing">${r.items.map(([id, g]) => {
        const f = foodById(id);
        return f ? `<li><span>${esc(t(f.name))}</span><small>${esc(portionText(f, g))} · ${portionOf(f, g).kcal} kcal</small></li>` : "";
      }).join("")}</ul>
      ${r.steps ? `<ol class="recipe-steps">${r.steps.map((s) => `<li>${esc(t(s))}</li>`).join("")}</ol>` : ""}
      <div class="row wrap">
        <button type="button" class="btn btn-green" data-recipe-add="${esc(r.id)}">${t("＋ Adaug la {m}", { m: t(currentMeal) })}</button>
        ${r.mine ? "" : `<button type="button" class="btn btn-ghost" data-recipe-fav="${esc(r.id)}" ${savedFav ? "disabled" : ""}>${savedFav ? t("⭐ E la favorite") : t("☆ Salvează la favorite")}</button>`}
      </div>
    </div>` : ""}
  </div>`;
}

function renderRecipes() {
  const box = $("#recipes-box");
  if (!box) return;
  const { mine, built } = recipeList();
  box.innerHTML =
    (mine.length ? `<h4>${t("Mesele tale")}</h4>${mine.map(recipeCard).join("")}` : "") +
    `<h4>${t("Ușor de făcut, multe calorii")}</h4>
     <p class="muted small">${t("Fără zahăr adăugat. Cele pentru care ai deja ingredientele sunt primele.")}</p>
     ${built.map(recipeCard).join("")}`;
}

const findRecipe = (id) => {
  const { mine, built } = recipeList();
  return [...mine, ...built].find((r) => r.id === id);
};

$("#recipes-box").addEventListener("click", (e) => {
  const head = e.target.closest("[data-recipe]");
  if (head) {
    openRecipe = openRecipe === head.dataset.recipe ? null : head.dataset.recipe;
    return renderRecipes();
  }
  const add = e.target.closest("[data-recipe-add]");
  if (add) {
    const r = findRecipe(add.dataset.recipeAdd);
    if (!r) return;
    addFavMeal(r, currentMeal, viewDate);
    save();
    return toast(t("{name} adăugat 🥗", { name: t(r.name) }));
  }
  const fav = e.target.closest("[data-recipe-fav]");
  if (fav) {
    const r = findRecipe(fav.dataset.recipeFav);
    if (!r) return;
    state.favMeals = [...(state.favMeals || []), { name: r.name, meal: r.meal, items: r.items.map((it) => [...it]) }];
    save();
    toast(t("⭐ Salvat la mese favorite"));
  }
});

renderRecipes();
