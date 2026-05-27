// ===========================================================
// 🧼 SHOWER MODE — Single pet
// ===========================================================
(() => {
  if (typeof window._modeCleanup === 'function') {
    try { window._modeCleanup(); } catch (_) {}
  }

  window._modeName = 'shower';
  window.activePetIndex = 0;
  window.setActivePet = function () { window.activePetIndex = 0; };

  if (typeof window.enterShowerClothesRules === 'function') {
    window.enterShowerClothesRules();
  } else {
    window._blockClothesInShower = true;
    if (typeof window.currentOutfit !== 'undefined') window.currentOutfit = 0;
    if (window.clothesBtn) window.clothesBtn.style.display = 'none';
  }

  if (window.SoundManager) SoundManager.stopAll();

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const groundHeight = 100;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  let groundY = canvas.height - groundHeight;

  const base = {
    bath1: new Image(),
    bath2: new Image(),
  };
  base.bath1.src = 'base.png';
  base.bath2.src = 'base_bath2.png';

  const bath = { currentBaseKey: 'bath1', lastDrawnBaseKey: 'bath1', wasTouching: false, x: 0, y: 0, w: 0, h: 0 };

  const poolImgs = { top: new Image(), bottom: new Image() };
  poolImgs.top.src = 'pool1.png';
  poolImgs.bottom.src = 'pool2.png';

  const sponge = { img: new Image(), x: 100, y: 100, width: 100, height: 100, dragging: false };
  sponge.img.src = 'sponge1.png';

  const splashSound = new Audio('splash.mp3');
  function playSplash() {
    try {
      splashSound.pause();
      splashSound.currentTime = 0;
      splashSound.play();
    } catch (_) {}
  }

  let dragTarget = null;
  let offsetX = 0;
  let offsetY = 0;

  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function startDrag(e) {
    e.preventDefault();
    const { x, y } = getPointerPos(e);
    if (x >= sponge.x && x <= sponge.x + sponge.width && y >= sponge.y && y <= sponge.y + sponge.height) {
      dragTarget = sponge;
      offsetX = x - sponge.x;
      offsetY = y - sponge.y;
      sponge.dragging = true;
    }
  }

  function moveDrag(e) {
    if (!dragTarget) return;
    e.preventDefault();
    const { x, y } = getPointerPos(e);
    dragTarget.x = x - offsetX;
    dragTarget.y = y - offsetY;
  }

  function stopDrag() {
    sponge.dragging = false;
    dragTarget = null;
  }

  canvas.addEventListener('mousedown', startDrag);
  canvas.addEventListener('mousemove', moveDrag);
  canvas.addEventListener('mouseup', stopDrag);
  canvas.addEventListener('touchstart', startDrag, { passive: false });
  canvas.addEventListener('touchmove', moveDrag, { passive: false });
  canvas.addEventListener('touchend', stopDrag);

  const hitbox = { xOffset: 120, yOffset: 90, width: 130, height: 150 };

  let running = true;
  let raf = 0;

  function drawBase(key) {
    let imgToDraw = base[key];
    if (!(imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0)) imgToDraw = base[bath.lastDrawnBaseKey];
    if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
      ctx.drawImage(imgToDraw, bath.x, bath.y, bath.w, bath.h);
      bath.lastDrawnBaseKey = imgToDraw === base.bath2 ? 'bath2' : 'bath1';
    }
  }

  function update() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = 1.3;
    const scaledW = 400 * scale;
    const scaledH = 400 * scale;
    bath.x = canvas.width * 0.5 - scaledW / 2;
    bath.y = groundY - scaledH;
    bath.w = scaledW;
    bath.h = scaledH;

    if (poolImgs.bottom.complete && poolImgs.bottom.naturalWidth > 0) ctx.drawImage(poolImgs.bottom, bath.x, bath.y, bath.w, bath.h);
    drawBase(bath.currentBaseKey);
    if (sponge.img.complete) ctx.drawImage(sponge.img, sponge.x, sponge.y, sponge.width, sponge.height);

    const touching =
      sponge.x + sponge.width > bath.x + hitbox.xOffset &&
      sponge.x < bath.x + hitbox.xOffset + hitbox.width &&
      sponge.y + sponge.height > bath.y + hitbox.yOffset &&
      sponge.y < bath.y + hitbox.yOffset + hitbox.height;

    if (touching) {
      bath.currentBaseKey = 'bath2';
      if (!bath.wasTouching) {
        playSplash();
        if (window.PetStats) window.PetStats.shower(0);
      }
      window.setActivePet(0);
    } else {
      bath.currentBaseKey = 'bath1';
    }
    bath.wasTouching = touching;

    if (poolImgs.top.complete && poolImgs.top.naturalWidth > 0) ctx.drawImage(poolImgs.top, bath.x, bath.y, bath.w, bath.h);
    raf = requestAnimationFrame(update);
  }
  update();

  function onResize() {
    resizeCanvas();
    groundY = canvas.height - groundHeight;
  }
  window.addEventListener('resize', onResize);

  window._modeCleanup = function () {
    running = false;
    cancelAnimationFrame(raf);
    if (typeof window.exitShowerClothesRules === 'function') window.exitShowerClothesRules();
    else {
      if (window.clothesBtn) window.clothesBtn.style.display = 'block';
      window._blockClothesInShower = false;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.removeEventListener('mousedown', startDrag);
    canvas.removeEventListener('mousemove', moveDrag);
    canvas.removeEventListener('mouseup', stopDrag);
    canvas.removeEventListener('touchstart', startDrag);
    canvas.removeEventListener('touchmove', moveDrag);
    canvas.removeEventListener('touchend', stopDrag);
    window.removeEventListener('resize', onResize);
  };
})();