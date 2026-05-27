// ===========================================================
// 😴 pet_sleep.js — Single pet sleep mode
// ===========================================================
(function () {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  if (typeof window._modeCleanup === 'function') { try { window._modeCleanup(); } catch (_) {} }
  window._modeName = 'sleep';
  window.activePetIndex = 0;
  window.setActivePet = function () { window.activePetIndex = 0; };

  const GROUND_OFFSET = 100;
  const BED_OFFSET = 420;
  const BED_W = 700;
  const BED_H = 450;
  const PET_W = 400;
  const PET_H = 450;

  let groundY = 0;
  let raf = 0;
  let running = true;
  let energyTimer = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundY = canvas.height - GROUND_OFFSET;
  }
  resize();

  function img(src) {
    const out = new Image();
    out._failed = false;
    out.onerror = () => { out._failed = true; };
    out.src = src;
    return out;
  }

  const images = {
    base: img('base.png'),
    bed: img('bed.png'),
    blanket: img('blanket1.png')
  };

  function drawImg(image, x, y, w, h) {
    if (image && !image._failed && image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, x, y, w, h);
    }
  }

  const pet = {
    x: canvas.width * 0.5,
    y: canvas.height - 340,
    w: PET_W,
    h: PET_H,
    dragging: false,
    inBed: false,
    sleeping: false
  };

  const bed = {
    x: canvas.width * 0.5,
    y: canvas.height - BED_OFFSET,
    w: BED_W,
    h: BED_H
  };

  const blanket = {
    x: bed.x,
    y: bed.y + BED_H * 0.25,
    w: BED_W + 40,
    h: BED_H * 0.45,
    dragging: false,
    visible: false,
    locked: false
  };

  let offsetX = 0;
  let offsetY = 0;
  let dragTarget = null;

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;

    return {
      x: t.clientX - r.left,
      y: t.clientY - r.top
    };
  }

  function rectHit(p, x, y, w, h) {
    return (
      p.x > x - w / 2 &&
      p.x < x + w / 2 &&
      p.y > y - h / 2 &&
      p.y < y + h / 2
    );
  }

  function restoreEnergy() {
    if (!pet.sleeping || !blanket.locked) return;

    if (window.PetStats && typeof window.PetStats.sleep === 'function') {
      window.PetStats.sleep(0, 5);
    }
  }

  function startEnergyRestore() {
    clearInterval(energyTimer);
    restoreEnergy();
    energyTimer = setInterval(restoreEnergy, 1000);
  }

  function stopEnergyRestore() {
    clearInterval(energyTimer);
    energyTimer = 0;
  }

  function down(e) {
    const p = pointer(e);

    if (
      blanket.visible &&
      !blanket.locked &&
      rectHit(p, blanket.x, blanket.y, blanket.w, blanket.h)
    ) {
      dragTarget = blanket;
      blanket.dragging = true;
      offsetX = p.x - blanket.x;
      offsetY = p.y - blanket.y;
      e.preventDefault();
      return;
    }

    if (!pet.inBed && rectHit(p, pet.x, pet.y, pet.w, pet.h)) {
      dragTarget = pet;
      pet.dragging = true;
      offsetX = p.x - pet.x;
      offsetY = p.y - pet.y;
      e.preventDefault();
    }
  }

  function move(e) {
    if (!dragTarget) return;

    const p = pointer(e);
    dragTarget.x = p.x - offsetX;
    dragTarget.y = p.y - offsetY;

    if (e.touches) e.preventDefault();
  }

  function up() {
    if (dragTarget === pet) {
      pet.dragging = false;

      if (
        Math.abs(pet.x - bed.x) < bed.w * 0.45 &&
        Math.abs(pet.y - bed.y) < bed.h * 0.6
      ) {
        pet.inBed = true;
        pet.x = bed.x;
        pet.y = bed.y;
        blanket.visible = true;
      }
    }

    if (dragTarget === blanket) {
      blanket.dragging = false;

      if (
        pet.inBed &&
        Math.abs(blanket.x - bed.x) < bed.w * 0.4 &&
        Math.abs(blanket.y - bed.y) < bed.h * 0.6
      ) {
        blanket.x = bed.x;
        blanket.y = bed.y + bed.h * 0.25;
        blanket.locked = true;
        pet.sleeping = true;

        window._petsSleeping = [true];

        startEnergyRestore();
      }
    }

    dragTarget = null;
  }

  function wake(e) {
    if (!pet.inBed || dragTarget) return;

    const p = pointer(e);

    if (rectHit(p, bed.x, bed.y, bed.w, bed.h)) {
      pet.inBed = false;
      pet.sleeping = false;
      pet.x = bed.x;
      pet.y = bed.y - bed.h / 2 - pet.h / 2;

      blanket.visible = false;
      blanket.locked = false;

      window._petsSleeping = [false];

      stopEnergyRestore();
    }
  }

  const events = [
    ['mousedown', down],
    ['mousemove', move],
    ['mouseup', up],
    ['touchstart', down],
    ['touchmove', move],
    ['touchend', up],
    ['click', wake]
  ];

  events.forEach(([ev, fn]) => {
    canvas.addEventListener(ev, fn, { passive: false });
  });

  function onResize() {
    resize();

    bed.x = canvas.width * 0.5;
    bed.y = canvas.height - BED_OFFSET;

    if (pet.inBed) {
      pet.x = bed.x;
      pet.y = bed.y;
    }

    if (blanket.locked) {
      blanket.x = bed.x;
      blanket.y = bed.y + bed.h * 0.25;
    }
  }

  window.addEventListener('resize', onResize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, groundY, canvas.width, GROUND_OFFSET);

    drawImg(
      images.bed,
      bed.x - bed.w / 2,
      bed.y - bed.h / 2,
      bed.w,
      bed.h
    );

    if (!pet.inBed) {
      drawImg(
        images.base,
        pet.x - pet.w / 2,
        pet.y - pet.h / 2,
        pet.w,
        pet.h
      );

      if (window.drawOutfitOverlay) {
        window.drawOutfitOverlay(
          ctx,
          'stand',
          pet.x - pet.w / 2,
          pet.y - pet.h / 2,
          pet.w,
          pet.h,
          0
        );
      }
    } else {
      drawImg(
        images.base,
        pet.x - pet.w / 2,
        pet.y - pet.h / 2,
        pet.w,
        pet.h
      );

      if (window.drawOutfitOverlay) {
        window.drawOutfitOverlay(
          ctx,
          'sleep',
          pet.x - pet.w / 2,
          pet.y - pet.h / 2,
          pet.w,
          pet.h,
          0
        );
      }
    }

    if (blanket.visible) {
      drawImg(
        images.blanket,
        blanket.x - blanket.w / 2,
        blanket.y - blanket.h / 2,
        blanket.w,
        blanket.h
      );
    }
  }

  function loop() {
    if (!running) return;
    draw();
    raf = requestAnimationFrame(loop);
  }

  loop();

  window._modeCleanup = function () {
    running = false;
    cancelAnimationFrame(raf);
    stopEnergyRestore();

    window._petsSleeping = [false];

    events.forEach(([ev, fn]) => {
      canvas.removeEventListener(ev, fn);
    });

    window.removeEventListener('resize', onResize);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
})();