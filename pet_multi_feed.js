// ===========================================================
// 🐾 FEED MODE — Single pet
// ===========================================================
(function () {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  resizeCanvas();

  window.activePetIndex = 0;
  window.setActivePet = function () { window.activePetIndex = 0; };

  const groundHeight = 100;
  let groundY = canvas.height - groundHeight;
  let floorY = canvas.height - groundHeight - 10;

  const sounds = {
    yum: [new Audio('yummy.mp3'), new Audio('yummy.mp3')],
    yuck: [new Audio('yuck.mp3'), new Audio('yuck.mp3')],
    bounce: [new Audio('bounce.mp3')],
    frozen: [new Audio('frozen.mp3')],
    spicy: [new Audio('spicy.mp3')],
    quack: [new Audio('quack.mp3')],
  };
  let soundIndex = 0;
  function playSound(key, volume = 0.9, rate = 1) {
    const pool = sounds[key];
    if (!pool) return;
    const s = pool[soundIndex++ % pool.length];
    try { s.pause(); s.currentTime = 0; s.volume = volume; s.playbackRate = rate; s.play(); } catch (_) {}
  }

  function createImg(src) {
    const img = new Image();
    img._failed = false;
    img.onerror = () => { img._failed = true; };
    img.src = src;
    return img;
  }

  const moodSet = {
    normal: createImg('base.png'),
    happy: createImg('base_happy.png'),
    disgust: createImg('base_disgust.png'),
    yellowgummybearfreeze: createImg('base_freeze.png'),
    spicy: createImg('base_spicy.png'),
  };

  const pet = { x: canvas.width * 0.5, y: canvas.height - 150 - 150, w: 400, h: 450, mood: 'normal' };
  const foods = [];
  let spawnMap = {};
  let activeFood = null;
  let hasMoved = false;
  let raf = 0;
  let spawnButtons = document.getElementById('spawn-buttons');

  let bubble = document.getElementById('bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'bubble';
    bubble.style.position = 'absolute';
    bubble.style.transform = 'translate(-50%, -100%)';
    bubble.style.background = 'rgba(255,255,255,0.95)';
    bubble.style.borderRadius = '10px';
    bubble.style.padding = '6px 10px';
    bubble.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    bubble.style.pointerEvents = 'none';
    bubble.style.fontSize = '14px';
    bubble.style.display = 'none';
    document.body.appendChild(bubble);
  }

  function showBubble(text) {
    bubble.style.left = pet.x + 'px';
    bubble.style.top = pet.y - pet.h / 2 - 40 + 'px';
    bubble.textContent = text;
    bubble.style.display = 'block';
    clearTimeout(showBubble._t);
    showBubble._t = setTimeout(() => (bubble.style.display = 'none'), 1200);
  }

  async function loadFeedConfig() {
    const res = await fetch('feed_items.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('feed_items.json not found');
    applyFeedConfig(await res.json());
  }

  function applyFeedConfig(cfg) {
    if (!cfg || !Array.isArray(cfg.items)) throw new Error('Invalid feed_items.json format');
    spawnMap = {};
    for (const it of cfg.items) {
      if (!it || !it.key) continue;
      spawnMap[it.key] = { name: it.key, imgSrc: it.imgSrc, liked: !!it.liked, w: Number(it.w) || 100, h: Number(it.h) || 100, type: it.type || 'normal' };
    }
    buildToolbar(cfg.items);
  }

  function spawnFood(type) {
    const def = spawnMap[type];
    if (!def) return;
    if (window.PetStats && !window.PetStats.useInventory(type)) { showBubble('No more ' + (def.name || type) + '! 🌱 Garden'); return; }
    refreshToolbar();
    const f = { ...def, img: new Image(), drag: false, visible: true, justSpawned: true, vy: 0, x: pet.x + Math.random() * 200 - 100, y: pet.y - 300 };
    f.img.src = def.imgSrc;
    setTimeout(() => (f.justSpawned = false), 800);
    foods.push(f);
    if (type === 'icegummybear') playSound('quack', 0.9, 0.9 + Math.random() * 0.2);
  }

  function clearFoods() { foods.length = 0; }

  function pos(e) { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
  function down(e) {
    const p = pos(e);
    if (p.x > pet.x - pet.w / 2 && p.x < pet.x + pet.w / 2 && p.y > pet.y - pet.h / 2 && p.y < pet.y + pet.h / 2) window.setActivePet(0);
    for (const f of foods) {
      if (!f.visible) continue;
      if (p.x > f.x - f.w / 2 && p.x < f.x + f.w / 2 && p.y > f.y - f.h / 2 && p.y < f.y + f.h / 2) {
        activeFood = f; f.drag = true; f.vy = 0; hasMoved = false; e.preventDefault(); return;
      }
    }
  }
  function move(e) { if (!activeFood) return; const p = pos(e); activeFood.x = p.x; activeFood.y = p.y; hasMoved = true; if (e.touches) e.preventDefault(); }
  function up() { if (activeFood && hasMoved) checkCollision(activeFood); if (activeFood) activeFood.drag = false; activeFood = null; }

  const listeners = [['mousedown', down], ['mousemove', move], ['mouseup', up], ['touchstart', down], ['touchmove', move], ['touchend', up]];
  listeners.forEach(([ev, fn]) => canvas.addEventListener(ev, fn, { passive: false }));

  function checkCollision(f) {
    if (!f.visible || f.justSpawned) return;
    const hit = Math.abs(f.x - pet.x) < f.w / 2 + pet.w / 2 && Math.abs(f.y - pet.y) < f.h / 2 + pet.h / 2;
    if (!hit) return;
    if (f.type === 'ice') { pet.mood = 'yellowgummybearfreeze'; showBubble('Brrr! 🧊'); playSound('frozen'); if (window.PetStats) window.PetStats.feedSpecial(0, 'ice'); }
    else if (f.type === 'spicy') { pet.mood = 'spicy'; showBubble('Spicy! 🌶️'); playSound('spicy'); if (window.PetStats) window.PetStats.feedSpecial(0, 'spicy'); }
    else { pet.mood = f.liked ? 'happy' : 'disgust'; showBubble(f.liked ? 'Yummy!' : 'Yuck!'); playSound(f.liked ? 'yum' : 'yuck'); if (window.PetStats) window.PetStats.feed(0, f.liked); }
    f.visible = false;
    setTimeout(() => (pet.mood = 'normal'), 1500);
  }

  function applyGravity() {
    for (const f of foods) {
      if (f.drag || !f.visible) continue;
      if (f.y + f.h / 2 < floorY) { f.vy = (f.vy || 0) + 0.6; f.y += f.vy; }
      else { f.y = floorY - f.h / 2; if (Math.abs(f.vy) > 2) playSound('bounce', 0.35); f.vy = -(f.vy || 0) * 0.4; if (Math.abs(f.vy) < 1) f.vy = 0; }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5c4033'; ctx.fillRect(0, groundY, canvas.width, groundHeight);
    const img = moodSet[pet.mood] || moodSet.normal;
    if (img && !img._failed && img.complete && img.naturalWidth > 0) ctx.drawImage(img, pet.x - pet.w / 2, pet.y - pet.h / 2, pet.w, pet.h);
    if (window.drawOutfitOverlay) window.drawOutfitOverlay(ctx, 'stand', pet.x - pet.w / 2, pet.y - pet.h / 2, pet.w, pet.h, 0);
    for (const f of foods) if (f.visible && f.img.complete) ctx.drawImage(f.img, f.x - f.w / 2, f.y - f.h / 2, f.w, f.h);
  }

  function loop() { applyGravity(); draw(); raf = requestAnimationFrame(loop); }

  function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  function onResize() { resizeCanvas(); groundY = canvas.height - groundHeight; floorY = canvas.height - groundHeight - 10; pet.x = canvas.width * 0.5; pet.y = canvas.height - 150 - 150; }
  window.addEventListener('resize', onResize);

  function enableDragScroll(scrollElement) {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    const start = (e) => { isDown = true; startX = (e.touches ? e.touches[0].pageX : e.pageX) - scrollElement.offsetLeft; scrollLeft = scrollElement.scrollLeft; };
    const end = () => { isDown = false; };
    const moveScroll = (e) => { if (!isDown) return; e.preventDefault(); const x = (e.touches ? e.touches[0].pageX : e.pageX) - scrollElement.offsetLeft; scrollElement.scrollLeft = scrollLeft - (x - startX) * 1.5; };
    scrollElement.addEventListener('mousedown', start);
    scrollElement.addEventListener('touchstart', start, { passive: false });
    scrollElement.addEventListener('mouseup', end);
    scrollElement.addEventListener('mouseleave', end);
    scrollElement.addEventListener('touchend', end);
    scrollElement.addEventListener('mousemove', moveScroll);
    scrollElement.addEventListener('touchmove', moveScroll, { passive: false });
  }

  function buildToolbar(items) {
    if (spawnButtons) spawnButtons.remove();
    spawnButtons = document.createElement('div');
    spawnButtons.id = 'spawn-buttons';
    spawnButtons.classList.add('combined-scroll-bar');
    spawnButtons.style.position = 'fixed';
    spawnButtons.style.top = '15px';
    spawnButtons.style.left = '50%';
    spawnButtons.style.transform = 'translateX(-50%)';
    spawnButtons.style.zIndex = '999';
    const btnHtml = (items || []).filter(it => it && it.key).map(it => {
      const count = window.PetStats ? window.PetStats.getInventory(it.key) : '?';
      return `<button data-spawn="${it.key}" ${count === 0 ? 'disabled style="opacity:0.5"' : ''}>${it.label || it.key} (${count})</button>`;
    }).join('');
    spawnButtons.innerHTML = `${btnHtml}<button id="clearFoods">🧹 Clear</button>`;
    document.body.appendChild(spawnButtons);
    enableDragScroll(spawnButtons);
    spawnButtons.querySelectorAll('button[data-spawn]').forEach(btn => {
      const k = btn.getAttribute('data-spawn');
      btn.addEventListener('click', () => spawnFood(k));
    });
    const clearBtn = document.getElementById('clearFoods');
    if (clearBtn) clearBtn.onclick = clearFoods;
  }

  function refreshToolbar() {
    if (!spawnButtons) return;
    spawnButtons.querySelectorAll('button[data-spawn]').forEach(btn => {
      const k = btn.getAttribute('data-spawn');
      const count = window.PetStats ? window.PetStats.getInventory(k) : 0;
      const def = spawnMap[k];
      btn.textContent = `${def ? (def.name || k) : k} (${count})`;
      btn.disabled = count <= 0;
      btn.style.opacity = count <= 0 ? '0.5' : '1';
    });
  }
  window._refreshFeedToolbar = refreshToolbar;

  loadFeedConfig().catch(err => console.warn(err));
  loop();

  window._modeCleanup = function () {
    cancelAnimationFrame(raf);
    listeners.forEach(([ev, fn]) => canvas.removeEventListener(ev, fn));
    window.removeEventListener('resize', onResize);
    if (bubble) bubble.style.display = 'none';
    if (spawnButtons) spawnButtons.remove();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
})();