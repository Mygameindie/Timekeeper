// Split-JSON dress-up system. One image per item: {prefix}.png
// Single Pet version
// - Pet 1 starts with top underwear + bottom underwear.
// - One-piece underwear clears top/bottom underwear.
// - Top/bottom underwear clears one-piece and auto-pairs matching set number.
// - Dress clears top + bottom; top or bottom clears dress.

(() => {
  const CAT_FILE = "dressup_categories.json";
  const DEFAULT_FILE = "dressup_defaults.json";
  const DEFAULT_COLOR = "Original";

  const COLORS = {
    Original: null,
    Red: "#ff3b30",
    Orange: "#ff9500",
    Yellow: "#ffcc00",
    Green: "#34c759",
    Cyan: "#32ade6",
    Blue: "#007aff",
    Purple: "#af52de",
    Pink: "#ff2d55",
  };

  const FALLBACK_CATS = [
    { key: "topUnderwear", label: "Top Underwear", z: 60, file: "dressup_top_underwear.json" },
    { key: "bottomUnderwear", label: "Bottom Underwear / Boxers", z: 50, file: "dressup_bottom_underwear.json" },
    { key: "onepieceUnderwear", label: "One-Piece Underwear", z: 65, file: "dressup_onepiece_underwear.json" },
    { key: "top", label: "Top", z: 120, file: "dressup_top.json" },
    { key: "bottom", label: "Pants / Skirt", z: 110, file: "dressup_bottom.json" },
    { key: "dress", label: "Dress", z: 130, file: "dressup_dress.json" },
    { key: "shoes", label: "Shoes", z: 90, file: "dressup_shoes.json" },
    { key: "hat", label: "Hat", z: 180, file: "dressup_hat.json" },
  ];

  function img(src) {
    const im = new Image();
    im._failed = false;
    im.onerror = () => {
      im._failed = true;
    };
    im.src = src;
    return im;
  }

  function itemFrom(raw) {
    const id = raw.id || raw.prefix;
    const prefix = raw.prefix || raw.id;
    if (!id || !prefix) return null;

    return {
      id,
      label: raw.label || id,
      img: img(`${prefix}.png`),
    };
  }

  function emptyCat(def) {
  const noNoneCategories = [
    "topUnderwear",
    "bottomUnderwear",
    "onepieceUnderwear",
  ];

  const items = noNoneCategories.includes(def.key)
    ? {}
    : { 0: { id: 0, label: "None", img: null } };

  return {
    label: def.label || def.key,
    z: Number(def.z) || 100,
    items,
  };
}

  async function getJson(file, fallback) {
    try {
      const r = await fetch(`${file}?v=${Date.now()}`);
      if (!r.ok) throw new Error(file);
      return await r.json();
    } catch (e) {
      console.warn("Dress-up JSON fallback:", file, e);
      return fallback;
    }
  }

  function underwearDefaults() {
    return {
      0: {
        topUnderwear: "topunderwear1",
        bottomUnderwear: "bottomunderwear1",
        onepieceUnderwear: 0,
        top: 0,
        bottom: 0,
        dress: 0,
        shoes: 0,
        hat: 0,
      },
    };
  }

  function fallbackDefaults() {
    return underwearDefaults();
  }

  function forceUnderwearDefaults(rawDefaults) {
    const base = underwearDefaults();
    const existing = rawDefaults?.[0] || rawDefaults?.["0"] || {};

    return {
      0: {
        ...base[0],
        ...existing,
      },
    };
  }

  function fallbackCatalog(cats) {
    const catalog = { 0: {} };

    cats.forEach(c => {
      catalog[0][c.key] = emptyCat(c);
    });

    const add = (cat, id, label) => {
      if (!catalog[0][cat]) return;
      catalog[0][cat].items[id] = {
        id,
        label,
        img: img(`${id}.png`),
      };
    };

    add("topUnderwear", "topunderwear1", "Top Underwear 1");
    add("bottomUnderwear", "bottomunderwear1", "Bottom Underwear 1");
    add("onepieceUnderwear", "onepieceunderwear1", "One-Piece Underwear 1");
    add("top", "top1", "Top 1");
    add("bottom", "pants1", "Pants 1");
    add("bottom", "skirt1", "Skirt 1");
    add("dress", "dress1", "Dress 1");
    add("shoes", "shoes1", "Shoes 1");
    add("hat", "hat1", "Hat 1");

    return catalog;
  }

  let cats = FALLBACK_CATS;
  let defaults = forceUnderwearDefaults(fallbackDefaults());

  window.dressUpCatalog = fallbackCatalog(cats);
  window.activePetIndex = 0;

  function makeSelected() {
    const d = defaults[0] || defaults["0"] || {};
    const o = {};

    cats.forEach(c => {
      o[c.key] = d[c.key] ?? 0;
    });

    return [o];
  }

  function makeColors() {
    const o = {};

    cats.forEach(c => {
      o[c.key] = DEFAULT_COLOR;
    });

    return [o];
  }

  window.selectedClothes = window.selectedClothes || makeSelected();
  window.clothingColors = window.clothingColors || makeColors();
  window.currentOutfits = [0];
  window.currentOutfit = 0;

  function activePet() {
    return 0;
  }

  function catKeys() {
    const catalog = window.dressUpCatalog[0] || {};

    return cats
      .map(c => c.key)
      .filter(k => catalog[k]);
  }

  function normalizeState() {
    const sel = makeSelected();
    const cols = makeColors();

    window.selectedClothes[0] = window.selectedClothes[0] || {};
    window.clothingColors[0] = window.clothingColors[0] || {};

    cats.forEach(c => {
      if (window.selectedClothes[0][c.key] === undefined) {
        window.selectedClothes[0][c.key] = sel[0][c.key] ?? 0;
      }

      if (window.clothingColors[0][c.key] === undefined) {
        window.clothingColors[0][c.key] = cols[0][c.key];
      }
    });
  }

  async function loadCatalog() {
    cats = await getJson(CAT_FILE, FALLBACK_CATS);
    if (!Array.isArray(cats) || !cats.length) cats = FALLBACK_CATS;

    defaults = forceUnderwearDefaults(await getJson(DEFAULT_FILE, fallbackDefaults()));

    const catalog = { 0: {} };

    cats.forEach(c => {
      catalog[0][c.key] = emptyCat(c);
    });

    await Promise.all(
      cats.map(async c => {
        if (!c.file) return;

        const data = await getJson(c.file, {});
        const list = data[0] || data["0"] || [];

        if (!Array.isArray(list)) return;

        list.forEach(raw => {
          const it = itemFrom(raw);
          if (it) catalog[0][c.key].items[it.id] = it;
        });
      })
    );

    window.dressUpCatalog = catalog;

    // IMPORTANT:
    // Rebuild selected clothes after loading dressup_defaults.json.
    // This makes dress1 + hat1 load correctly from your defaults file.
    window.selectedClothes = makeSelected();
    window.clothingColors = window.clothingColors || makeColors();

    normalizeState();

    if (!catKeys().includes(selectedCategory)) {
      selectedCategory = catKeys()[0] || "topUnderwear";
    }

    renderPanel();
    updateButtonLabel();
  }

  function setNumberFromId(id) {
    const m = String(id || "").match(/(\d+)(?:_\d+)?$/);
    return m ? m[1] : null;
  }

  function findItemBySetNumber(category, n) {
    if (!n) return 0;

    const items = window.dressUpCatalog[0]?.[category]?.items || {};
    const entries = Object.keys(items).filter(id => id !== "0");

    return entries.find(id => setNumberFromId(id) === String(n)) || 0;
  }

  function applyUnderwearRules(category, id) {
    if (id === 0 || id === "0") return;

    if (category === "onepieceUnderwear") {
      window.selectedClothes[0].topUnderwear = 0;
      window.selectedClothes[0].bottomUnderwear = 0;
      return;
    }

    if (category === "topUnderwear" || category === "bottomUnderwear") {
      const n = setNumberFromId(id);

      window.selectedClothes[0].onepieceUnderwear = 0;

      const topMatch = findItemBySetNumber("topUnderwear", n);
      const bottomMatch = findItemBySetNumber("bottomUnderwear", n);

      if (topMatch) window.selectedClothes[0].topUnderwear = topMatch;
      if (bottomMatch) window.selectedClothes[0].bottomUnderwear = bottomMatch;
    }
  }

  function applyDressRules(category, id) {
    if (id === 0 || id === "0") return;

    if (category === "dress") {
      window.selectedClothes[0].top = 0;
      window.selectedClothes[0].bottom = 0;
      return;
    }

    if (category === "top" || category === "bottom") {
      window.selectedClothes[0].dress = 0;
    }
  }

  function applyClothingRules(category, id) {
    applyUnderwearRules(category, id);
    applyDressRules(category, id);
  }

  const tintCache = new Map();

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    return m
      ? {
          r: parseInt(m[1], 16),
          g: parseInt(m[2], 16),
          b: parseInt(m[3], 16),
        }
      : null;
  }

  function tintedImage(source, hex) {
    if (!hex || !source || source._failed || !source.complete || !source.naturalWidth) {
      return source;
    }

    const key = `${source.src}|${hex}`;
    if (tintCache.has(key)) return tintCache.get(key);

    const rgb = hexToRgb(hex);
    if (!rgb) return source;

    const cv = document.createElement("canvas");
    cv.width = source.naturalWidth;
    cv.height = source.naturalHeight;

    const cx = cv.getContext("2d", { willReadFrequently: true });

    try {
      cx.drawImage(source, 0, 0);

      const imageData = cx.getImageData(0, 0, cv.width, cv.height);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;

        const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        const shade = Math.max(0.18, Math.min(1.25, lum * 1.35));

        d[i] = Math.min(255, rgb.r * shade);
        d[i + 1] = Math.min(255, rgb.g * shade);
        d[i + 2] = Math.min(255, rgb.b * shade);
      }

      cx.putImageData(imageData, 0, 0);
    } catch (_) {
      return source;
    }

    const out = new Image();
    out.src = cv.toDataURL("image/png");

    tintCache.set(key, out);

    return out;
  }

  function safeDraw(ctx, image, x, y, w, h) {
    if (!image || image._failed || !image.complete || !image.naturalWidth) {
      return false;
    }

    ctx.drawImage(image, x, y, w, h);
    return true;
  }

  let selectedCategory = "topUnderwear";

  const btnCss =
    "border:0;border-radius:9px;padding:7px 10px;margin:3px;background:rgba(0,0,0,.08);cursor:pointer;font-size:13px;white-space:nowrap;";

  function btn(text) {
    const b = document.createElement("button");
    b.textContent = text;
    b.style.cssText = btnCss;
    return b;
  }

  let dressBtn = document.getElementById("dressup-btn");

  if (!dressBtn) {
    dressBtn = document.createElement("button");
    dressBtn.id = "dressup-btn";
    dressBtn.style.cssText =
      "position:fixed;right:10px;bottom:calc(65px + env(safe-area-inset-bottom));z-index:9998;padding:6px 12px;font-size:clamp(11px,2.5vw,14px);cursor:pointer;border-radius:8px;border:none;background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.15);white-space:nowrap;";
    document.body.appendChild(dressBtn);
  }

  window.clothesBtn = dressBtn;

  let panel = document.getElementById("dressup-panel");

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "dressup-panel";
    panel.style.cssText =
      "position:fixed;right:10px;bottom:calc(108px + env(safe-area-inset-bottom));width:min(360px,calc(100vw - 20px));max-height:54vh;overflow:auto;display:none;z-index:9999;padding:10px;border-radius:12px;background:rgba(255,255,255,.95);box-shadow:0 6px 24px rgba(0,0,0,.22);font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;";
    document.body.appendChild(panel);
  }

  function updateButtonLabel() {
    const count = catKeys()
      .map(k => window.selectedClothes[0]?.[k])
      .filter(v => v !== 0 && v !== "0").length;

    dressBtn.textContent = `Dress Up (${count} item${count === 1 ? "" : "s"})`;
  }

  function renderPanel() {
    const catalog = window.dressUpCatalog[0] || {};
    const keys = catKeys();

    if (!keys.includes(selectedCategory)) {
      selectedCategory = keys[0] || "topUnderwear";
    }

    panel.innerHTML = "";

    const title = document.createElement("div");
    title.style.cssText =
      "font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;gap:8px;align-items:center;";
    title.innerHTML = `<span>Dress Up</span>`;

    const close = btn("✕");
    close.style.padding = "4px 8px";
    close.onclick = () => {
      panel.style.display = "none";
    };

    title.appendChild(close);
    panel.appendChild(title);

    const row = document.createElement("div");
    row.style.cssText = "display:flex;overflow-x:auto;padding-bottom:4px;margin-bottom:8px;";

    keys.forEach(k => {
      const b = btn(catalog[k].label || k);

      if (k === selectedCategory) {
        b.style.cssText += "background:rgba(0,0,0,.22);font-weight:700;";
      }

      b.onclick = () => {
        selectedCategory = k;
        renderPanel();
      };

      row.appendChild(b);
    });

    panel.appendChild(row);

    const cat = catalog[selectedCategory];
    if (!cat) return;

    const itemTitle = document.createElement("div");
    itemTitle.textContent = "Item";
    itemTitle.style.cssText = "font-weight:600;margin:8px 0 4px;";
    panel.appendChild(itemTitle);

    const items = document.createElement("div");
    items.style.cssText = "display:flex;flex-wrap:wrap;gap:2px;margin-bottom:8px;";

    Object.entries(cat.items || {}).forEach(([id, it]) => {
      const active = String(window.selectedClothes[0]?.[selectedCategory]) === String(id);
      const b = btn(it.label || String(id));

      if (active) {
        b.style.cssText += "background:rgba(0,0,0,.22);font-weight:700;";
      }

      b.onclick = () => {
        window.selectedClothes[0][selectedCategory] = id === "0" ? 0 : id;
        applyClothingRules(selectedCategory, window.selectedClothes[0][selectedCategory]);
        renderPanel();
        updateButtonLabel();
      };

      items.appendChild(b);
    });

    panel.appendChild(items);

    const colorTitle = document.createElement("div");
    colorTitle.textContent = "Color";
    colorTitle.style.cssText = "font-weight:600;margin:8px 0 4px;";
    panel.appendChild(colorTitle);

    const colorRow = document.createElement("div");
    colorRow.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";

    Object.entries(COLORS).forEach(([name, hex]) => {
      const active = (window.clothingColors[0]?.[selectedCategory] || DEFAULT_COLOR) === name;
      const b = btn(name === DEFAULT_COLOR ? DEFAULT_COLOR : "");

      b.title = name;
      b.style.cssText += `min-width:${name === DEFAULT_COLOR ? "72px" : "30px"};height:30px;border:${
        active ? "2px solid #111" : "1px solid rgba(0,0,0,.2)"
      };background:${hex || "linear-gradient(45deg,#fff,#ddd)"};`;

      b.onclick = () => {
        window.clothingColors[0][selectedCategory] = name;
        renderPanel();
      };

      colorRow.appendChild(b);
    });

    panel.appendChild(colorRow);

    const note = document.createElement("div");
    note.textContent =
      "One-piece clears top/bottom underwear. Dress clears top + pants/skirt. Choosing top or pants/skirt clears dress.";
    note.style.cssText = "font-size:11px;opacity:.65;margin-top:8px;";
    panel.appendChild(note);

    updateButtonLabel();
  }

  dressBtn.onclick = () => {
    if (window._modeName === "shower") return;

    panel.style.display = panel.style.display === "none" ? "block" : "none";
    renderPanel();
  };

  window.drawOutfitOverlay = function (ctx, state, x, y, w, h) {
    if (window._modeName === "shower") return false;

    const catalog = window.dressUpCatalog[0] || {};
    let drew = false;

    catKeys()
      .sort((a, b) => (catalog[a].z || 0) - (catalog[b].z || 0))
      .forEach(k => {
        const id = window.selectedClothes[0]?.[k] ?? 0;

        if (id === 0 || id === "0") return;

        const it = catalog[k]?.items?.[id];

        if (!it || !it.img || it.img._failed) return;

        const hex = COLORS[window.clothingColors[0]?.[k] || DEFAULT_COLOR] || null;
        const drawImg = hex ? tintedImage(it.img, hex) : it.img;

        if (safeDraw(ctx, drawImg, x, y, w, h)) drew = true;
      });

    return drew;
  };

  window.enterShowerClothesRules = function () {
    if (!window._prevDressUpBeforeShower) {
      window._prevDressUpBeforeShower = { ...window.selectedClothes[0] };
    }

    Object.keys(window.selectedClothes[0]).forEach(k => {
      window.selectedClothes[0][k] = 0;
    });

    dressBtn.style.display = "none";
    panel.style.display = "none";
    updateButtonLabel();
  };

  window.exitShowerClothesRules = function () {
    if (window._prevDressUpBeforeShower) {
      window.selectedClothes[0] = { ...window._prevDressUpBeforeShower };
      delete window._prevDressUpBeforeShower;
    }

    dressBtn.style.display = "block";
    updateButtonLabel();
  };

  window.setActivePet = function () {
    window.activePetIndex = 0;
    renderPanel();
    updateButtonLabel();
  };

  normalizeState();
  renderPanel();
  updateButtonLabel();
  loadCatalog();
})();