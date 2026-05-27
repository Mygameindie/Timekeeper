// ===========================================================
// 🐾 pet_script.js — Single pet base + outfit system
// ===========================================================
(function () {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  window.activePetIndex = 0;
  window.setActivePet = function () { window.activePetIndex = 0; };

  const groundHeight = 100;
  let groundY = canvas.height - groundHeight;

  function createImg(src) {
    const img = new Image();
    img._failed = false;
    img.onerror = () => { img._failed = true; };
    img.src = src;
    return img;
  }

  const baseSet = {
    stand: createImg('base.png'),
    fall: createImg('base.png'),
    fly0: createImg('base.png'),
    fly1: createImg('base.png'),
  };

  function safeDraw(img, x, y, w, h) {
    if (!img || img._failed || !img.complete || img.naturalWidth === 0) return;
    ctx.drawImage(img, x, y, w, h);
  }

  const pet = {
    x: canvas.width * 0.5,
    y: canvas.height - 170 - 170,
    w: 400,
    h: 450,
    type: 'pet1',
    dragging: false,
    oldx: 0,
    oldy: 0,
    vy: 0,
    onGround: false,
    frame: 0,
    timer: 0,
  };
  pet.oldx = pet.x;
  pet.oldy = pet.y;

  const pets = [pet];
  const gravity = 1.2;
  const damping = 0.985;
  const bouncePower = 25;
  const MIN_IMPACT = 2.0;
  const speed = 10;

  const landSound = new Audio('fly.mp3');
  landSound.volume = 0.6;

  let audioUnlocked = false;
  function unlockAudio() {
    if (audioUnlocked) return;
    landSound.play().then(() => {
      landSound.pause();
      landSound.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => {});
  }
  window.addEventListener('mousedown', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });

  let activePet = null;

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x, y };
  }

  function startDrag(e) {
    if (window._modeName === 'shower') return;
    if (window._gardenMode) return;

    const p = getPos(e);
    if (
      p.x > pet.x - pet.w / 2 &&
      p.x < pet.x + pet.w / 2 &&
      p.y > pet.y - pet.h / 2 &&
      p.y < pet.y + pet.h / 2
    ) {
      pet.dragging = true;
      activePet = pet;
      window.setActivePet(0);
      e.preventDefault();
    }
  }

  function moveDrag(e) {
    if (!activePet || !activePet.dragging) return;
    const p = getPos(e);
    activePet.x = p.x;
    activePet.y = p.y;
    if (e.touches) e.preventDefault();
  }

  function playImpactSound(volume = 0.6) {
    if (!audioUnlocked) return;
    try {
      landSound.volume = volume;
      landSound.currentTime = 0;
      landSound.play().catch(() => {});
    } catch (_) {}
  }

  function endDrag() {
    if (activePet && activePet.dragging) {
      activePet.oldx = activePet.x;
      activePet.oldy = activePet.y;
      if (activePet.y + activePet.h / 2 > groundY) {
        activePet.y = groundY - activePet.h / 2;
        activePet.vy = -Math.max(12, bouncePower * 0.6);
        playImpactSound(0.5);
      }
      if (window.PetStats) window.PetStats.play(0);
      activePet.dragging = false;
    }
    activePet = null;
  }

  const listeners = [
    ['mousedown', startDrag],
    ['mousemove', moveDrag],
    ['mouseup', endDrag],
    ['touchstart', startDrag],
    ['touchmove', moveDrag],
    ['touchend', endDrag],
  ];
  listeners.forEach(([ev, fn]) => canvas.addEventListener(ev, fn, { passive: false }));

  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundY = canvas.height - groundHeight;
    pet.x = Math.min(Math.max(pet.x, pet.w / 2), canvas.width - pet.w / 2);
    if (pet.y + pet.h / 2 > groundY) {
      pet.y = groundY - pet.h / 2;
      pet.oldy = pet.y;
    }
  }
  window.addEventListener('resize', onResize);

  function update() {
    if (pet.dragging) return;

    const vx = (pet.x - pet.oldx) * damping;
    pet.vy = (pet.y - pet.oldy) * damping;
    const prevBottom = pet.oldy + pet.h / 2;

    pet.oldx = pet.x;
    pet.oldy = pet.y;
    pet.x += vx;

    const vyNext = pet.vy + gravity;
    const yNext = pet.y + vyNext;
    const nextBottom = yNext + pet.h / 2;
    const crossingGround = prevBottom < groundY && nextBottom >= groundY && vyNext > 0;

    if (crossingGround) {
      pet.y = groundY - pet.h / 2;
      if (vyNext > MIN_IMPACT) {
        pet.vy = -bouncePower;
        if (!pet.onGround) playImpactSound(Math.min(0.2 + (vyNext / 30), 1.0));
      } else {
        pet.vy = 0;
      }
      pet.onGround = true;
    } else {
      pet.y = yNext;
      if (pet.y + pet.h / 2 > groundY) {
        pet.y = groundY - pet.h / 2;
        pet.vy = 0;
        pet.onGround = true;
      } else {
        pet.vy = vyNext;
        pet.onGround = false;
      }
    }
  }

  function drawGround() {
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, groundY, canvas.width, groundHeight);
  }

  function getState() {
    let state = 'stand';
    if (pet.y + pet.h / 2 < groundY) {
      if (pet.vy > 5) {
        state = 'fall';
      } else {
        pet.timer++;
        if (pet.timer > speed) {
          pet.timer = 0;
          pet.frame = (pet.frame + 1) % 2;
        }
        state = pet.frame ? 'fly1' : 'fly0';
      }
    }
    return state;
  }

  function drawPet() {
    const state = getState();
    ctx.save();
    safeDraw(baseSet[state], pet.x - pet.w / 2, pet.y - pet.h / 2, pet.w, pet.h);
    if (typeof window.drawOutfitOverlay === 'function') {
      window.drawOutfitOverlay(ctx, state, pet.x - pet.w / 2, pet.y - pet.h / 2, pet.w, pet.h, 0);
    }
    ctx.restore();
  }

  window.getPetPose = function () {
    return {
      pets: [{ x: pet.x, y: pet.y, w: pet.w, h: pet.h }],
      activePetIndex: 0,
      groundY,
      canvasRect: canvas.getBoundingClientRect(),
    };
  };

  let raf = 0;
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();
    drawGround();
    drawPet();
    try {
      window.dispatchEvent(new CustomEvent('pet:pose', { detail: { pets: [{ x: pet.x, y: pet.y, w: pet.w, h: pet.h }], activePetIndex: 0 } }));
    } catch (_) {}
    raf = requestAnimationFrame(loop);
  }
  loop();

  window._modeCleanup = function () {
    cancelAnimationFrame(raf);
    listeners.forEach(([ev, fn]) => canvas.removeEventListener(ev, fn));
    window.removeEventListener('resize', onResize);
  };
  window._modeName = 'normal';
})();