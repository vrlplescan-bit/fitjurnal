// ===== FitJurnal – scanare cod de bare =====
// Camera citește codul (EAN), iar valorile nutriționale vin din Open Food Facts
// (bază de date gratuită, cu produse din toată lumea și etichete în orice limbă).
// Pe iPhone, Safari nu are BarcodeDetector, așa că folosim biblioteca ZXing (se încarcă doar la prima scanare).
// Produsele găsite se salvează la „Alimentele mele”, deci a doua oară merg și fără internet.

const ZXING_URL = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
let scanReader = null;
let scanStream = null;
let scanBusy = false;

function loadZxing() {
  if (window.ZXing) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = ZXING_URL;
    s.onload = ok;
    s.onerror = () => fail(new Error("zxing"));
    document.head.appendChild(s);
  });
}

const scanMsg = (txt) => { $("#scan-msg").textContent = txt; };

async function openScanner() {
  $("#scanner").hidden = false;
  scanBusy = false;
  scanMsg(t("Ține codul de bare în chenar…"));
  const video = $("#scan-video");
  try {
    if ("BarcodeDetector" in window) {
      // Detectorul nativ (Chrome/Android)
      const det = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = scanStream;
      await video.play();
      const tick = async () => {
        if (!scanStream || scanBusy) return;
        try {
          const codes = await det.detect(video);
          if (codes.length) return onCode(codes[0].rawValue);
        } catch (e) { /* cadru nefolosibil, încercăm iar */ }
        requestAnimationFrame(tick);
      };
      tick();
    } else {
      await loadZxing();
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
      scanReader = new ZXing.BrowserMultiFormatReader(hints, 300);
      await scanReader.decodeFromConstraints({ video: { facingMode: "environment" } }, video, (res) => {
        if (res && !scanBusy) onCode(res.getText());
      });
    }
  } catch (err) {
    scanMsg(err.message === "zxing"
      ? t("Nu am putut încărca scanerul (ai internet?). Poți scrie codul de sub bare mai sus.")
      : t("Nu am acces la cameră. Permite camera pentru site în Setări → Safari, sau scrie codul mai sus."));
  }
}

function closeScanner() {
  $("#scanner").hidden = true;
  if (scanReader) { try { scanReader.reset(); } catch (e) { /* deja oprit */ } scanReader = null; }
  if (scanStream) { scanStream.getTracks().forEach((tr) => tr.stop()); scanStream = null; }
  $("#scan-video").srcObject = null;
}

async function onCode(code) {
  code = String(code).replace(/\D/g, "");
  if (code.length < 8 || scanBusy) return;
  scanBusy = true;
  scanMsg(t("Cod {c} – caut produsul…", { c: code }));
  // L-ai mai scanat? Îl ai deja salvat
  const known = (state.customFoods || []).find((f) => f.ean === code);
  if (known) { closeScanner(); return pickFood(known); }
  try {
    const food = await lookupBarcode(code);
    closeScanner();
    if (!food) return notFound(code);
    state.customFoods = [food, ...(state.customFoods || [])];
    save();
    toast(t("📷 Găsit: {name}", { name: food.name }));
    pickFood(food);
  } catch (e) {
    scanBusy = false;
    scanMsg(t("Nu am putut căuta produsul (ai internet?). Încearcă din nou."));
  }
}

// Open Food Facts: numele în limba aplicației, apoi oricare; valori la 100 g
async function lookupBarcode(code) {
  const fields = "product_name,product_name_ro,product_name_en,product_name_de,generic_name,brands,nutriments,serving_quantity,quantity";
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("off " + res.status);
  const data = await res.json();
  const p = data.product;
  if (!data.status || !p) return null;
  const nu = p.nutriments || {};
  const num = (v) => Math.max(0, Math.round((parseFloat(v) || 0) * 10) / 10);
  let kcal = num(nu["energy-kcal_100g"]);
  if (!kcal && nu["energy_100g"]) kcal = Math.round(num(nu["energy_100g"]) / 4.184);
  if (!kcal) return null;
  const name = (p["product_name_" + LANG] || p.product_name || p.product_name_en || p.product_name_de || p.generic_name || code).trim();
  const brand = (p.brands || "").split(",")[0].trim();
  const fullName = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name;
  const serving = num(p.serving_quantity);
  return {
    id: "ean-" + code, ean: code, name: fullName, cat: "Alimentele mele",
    kcal, p: num(nu.proteins_100g), c: num(nu.carbohydrates_100g), f: num(nu.fat_100g),
    portion: serving || 100, label: serving ? "1 porție" : "100 g", custom: true,
    units: serving ? [{ label: "porție", g: serving, def: true }] : [],
  };
}

// Nu e în bază: deschidem formularul și ținem minte codul pentru data viitoare
function notFound(code) {
  const form = $("#custom-form");
  form.hidden = false;
  form.dataset.ean = code;
  form.elements.name.value = "";
  form.elements.name.focus();
  toast(t("Produsul nu e în baza de date. Scrie valorile de pe etichetă o singură dată – data viitoare îl recunosc."), 6000);
}

$("#scan-btn").addEventListener("click", openScanner);
$("#scan-close").addEventListener("click", closeScanner);
$("#scan-manual").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = e.target.elements.code.value;
  e.target.reset();
  onCode(v);
});
