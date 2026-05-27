// ===========================================================
// 📊 pet_stats.js — Single Pet Stats, Save/Load, Sound Settings
// Tracks hunger, happiness, cleanliness, energy for one pet.
// ===========================================================
(() => {
  const SAVE_KEY = 'purelilypet_save';

  const DECAY = {
    hunger: 0.15,
    happiness: 0.08,
    cleanliness: 0.06,
    energy: 0.10,
  };

  function defaultStats() {
    return { hunger: 80, happiness: 90, cleanliness: 85, energy: 75 };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function writeSave(data) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (_) {}
  }

  const saved = loadSave();
  const oldPet = saved && Array.isArray(saved.pets) ? saved.pets[0] : null;
  const petStats = { ...defaultStats(), ...(oldPet || saved?.pet || {}) };

  window.activePetIndex = 0;
  window.setActivePet = function () { window.activePetIndex = 0; };

  if (saved && Array.isArray(saved.outfits)) {
    window.currentOutfits = [saved.outfits[0] || 0];
    window.currentOutfit = window.currentOutfits[0];
  }

  function defaultInventory() {
    return {
      jelly: 2,
      bittergummybear: 2,
      pinkgummybear: 2,
      yellowgummybear: 2,
      icegummybear: 2,
      giantgummybear: 2,
      rainbowgummybear: 2,
    };
  }

  let gardenInventory = saved && saved.gardenInventory
    ? { ...defaultInventory(), ...saved.gardenInventory }
    : defaultInventory();

  let muted = saved && saved.muted === true;
  function clamp(v) { return Math.max(0, Math.min(100, v)); }

  let lastTick = Date.now();
  function tick() {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    const isSleeping = Array.isArray(window._petsSleeping) && window._petsSleeping[0];
    petStats.hunger = clamp(petStats.hunger - DECAY.hunger * dt);
    petStats.happiness = clamp(petStats.happiness - DECAY.happiness * dt);
    petStats.cleanliness = clamp(petStats.cleanliness - DECAY.cleanliness * dt);
    if (!isSleeping) petStats.energy = clamp(petStats.energy - DECAY.energy * dt);

    updateUI();
  }

  function doSave() {
    writeSave({
      pet: { ...petStats },
      pets: [{ ...petStats }],
      outfits: Array.isArray(window.currentOutfits) ? [window.currentOutfits[0] || 0] : [window.currentOutfit || 0],
      muted,
      gardenInventory: { ...gardenInventory },
      savedAt: Date.now(),
    });
  }

  let statsEl = document.getElementById('pet-stats-panel');
  if (!statsEl) {
    statsEl = document.createElement('div');
    statsEl.id = 'pet-stats-panel';
    document.body.appendChild(statsEl);
  }

  function statBar(key, label, color) {
    return `
      <div style="margin: 3px 0;">
        <div style="display:flex; justify-content:space-between; margin-bottom:1px;">
          <span>${label}</span>
          <span id="stat-val-${key}-0">0%</span>
        </div>
        <div style="height:8px; background:#e5e7eb; border-radius:999px; overflow:hidden;">
          <div id="stat-fill-${key}-0" style="height:100%; width:0%; background:${color}; border-radius:999px; transition:width .3s ease;"></div>
        </div>
      </div>
    `;
  }

  function buildStatsUI() {
    statsEl.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'stats-card';
    card.dataset.pet = '0';
    card.innerHTML = `
      <div style="font-weight:600; margin-bottom:3px;">Pet</div>
      ${statBar('hunger', 'Hunger', '#fb923c')}
      ${statBar('happiness', 'Happy', '#4ade80')}
      ${statBar('cleanliness', 'Clean', '#38bdf8')}
      ${statBar('energy', 'Energy', '#a78bfa')}
    `;
    statsEl.appendChild(card);

    const muteBtn = document.createElement('button');
    muteBtn.id = 'mute-btn';
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.title = 'Toggle sound';
    muteBtn.addEventListener('click', () => {
      muted = !muted;
      muteBtn.textContent = muted ? '🔇' : '🔊';
      applyMute();
      doSave();
    });
    statsEl.appendChild(muteBtn);

    applyMute();
  }

  function updateUI() {
    for (const key of ['hunger', 'happiness', 'cleanliness', 'energy']) {
      const fill = document.getElementById(`stat-fill-${key}-0`);
      const val = document.getElementById(`stat-val-${key}-0`);
      if (fill) fill.style.width = Math.round(petStats[key]) + '%';
      if (val) val.textContent = Math.round(petStats[key]) + '%';
    }
  }

  function applyMute() {
    if (window.SoundManager) window.SoundManager._muted = muted;
    if (!Audio.prototype._origPlay) {
      Audio.prototype._origPlay = Audio.prototype.play;
      Audio.prototype.play = function () {
        if (window.SoundManager && window.SoundManager._muted) this.volume = 0;
        return Audio.prototype._origPlay.call(this);
      };
    }
  }

  function stat() { return petStats; }
  function index() { return 0; }

  window.PetStats = {
    get() { return { ...stat() }; },
    feed(_petIdx, liked) {
      const s = stat();
      if (liked) { s.hunger = clamp(s.hunger + 20); s.happiness = clamp(s.happiness + 5); }
      else { s.hunger = clamp(s.hunger + 8); s.happiness = clamp(s.happiness - 5); }
      doSave();
    },
    feedSpecial(_petIdx, type) {
      const s = stat();
      s.hunger = clamp(s.hunger + 12);
      if (type === 'ice') s.happiness = clamp(s.happiness + 3);
      if (type === 'spicy') s.happiness = clamp(s.happiness - 3);
      doSave();
    },
    shower() { stat().cleanliness = clamp(stat().cleanliness + 8); doSave(); },
    sprayClean() { stat().cleanliness = clamp(stat().cleanliness + 1); doSave(); },
    sleep(_petIdx, amount) { stat().energy = clamp(stat().energy + (typeof amount === 'number' ? amount : 15)); doSave(); },
    troll() { stat().happiness = clamp(stat().happiness - 8); doSave(); },
    play() { stat().happiness = clamp(stat().happiness + 2); doSave(); },
    karaoke() { const s = stat(); s.happiness = clamp(s.happiness + 10); s.energy = clamp(s.energy - 5); doSave(); },
    heal() { const s = stat(); s.hunger = clamp(s.hunger + 30); s.happiness = clamp(s.happiness + 25); s.cleanliness = clamp(s.cleanliness + 20); s.energy = clamp(s.energy + 30); doSave(); },
    playground() { const s = stat(); s.happiness = clamp(s.happiness + 4); s.energy = clamp(s.energy - 2); doSave(); },
    isMuted() { return muted; },
    getInventory(key) { return key === undefined ? { ...gardenInventory } : (gardenInventory[key] !== undefined ? gardenInventory[key] : 0); },
    addInventory(key, amount) { gardenInventory[key] = (gardenInventory[key] || 0) + (amount || 1); doSave(); },
    useInventory(key) { if ((gardenInventory[key] || 0) <= 0) return false; gardenInventory[key]--; doSave(); return true; },
    save() { doSave(); },
  };

  buildStatsUI();
  updateUI();
  applyMute();
  setInterval(tick, 500);
  setInterval(doSave, 10000);
  window.addEventListener('beforeunload', doSave);
})();