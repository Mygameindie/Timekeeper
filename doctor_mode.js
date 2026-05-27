// ===========================================================
// 🩺 DOCTOR MODE — Single pet
// ===========================================================
(() => {
  if (typeof window._modeCleanup === 'function') {
    try { window._modeCleanup(); } catch (_) {}
  }
  window._modeName = 'doctor';
  window.activePetIndex = 0;
  window.setActivePet = function () { window.activePetIndex = 0; };

  if (window.SoundManager) window.SoundManager.stopAll();

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();

  const groundHeight = 100;
  let groundY = canvas.height - groundHeight;

  function loadImg(src) {
    const img = new Image();
    img._failed = false;
    img.onerror = () => { img._failed = true; };
    img.src = src;
    return img;
  }

  const imgs = {
    sick: loadImg('base_sick.png'),
    healed: loadImg('base_healed.png'),
    normal: loadImg('base.png'),
  };

  function getImg(key) {
    const img = imgs[key];
    if (img && !img._failed && img.complete && img.naturalWidth > 0) return img;
    if (imgs.normal.complete && imgs.normal.naturalWidth > 0) return imgs.normal;
    return null;
  }

  const PET_W = 400;
  const PET_H = 450;
  const pet = { phase: 'sick', healTimer: 0 };
  function petX() { return canvas.width * 0.5; }
  function petY() { return groundY - PET_H / 2; }

  const PILL_R = 36;
  const medicine = { x: canvas.width / 2, y: canvas.height * 0.25, dragging: false };
  let offsetX = 0;
  let offsetY = 0;

  function getPtr(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  function onDown(e) {
    const p = getPtr(e);
    const dx = p.x - medicine.x;
    const dy = p.y - medicine.y;
    if (Math.sqrt(dx * dx + dy * dy) <= PILL_R + 10) {
      medicine.dragging = true;
      offsetX = dx;
      offsetY = dy;
      e.preventDefault();
    }
  }

  function onMove(e) {
    if (!medicine.dragging) return;
    const p = getPtr(e);
    medicine.x = p.x - offsetX;
    medicine.y = p.y - offsetY;
    if (e.touches) e.preventDefault();
  }

  function onUp() { medicine.dragging = false; }

  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp);

  function onResize() {
    resizeCanvas();
    groundY = canvas.height - groundHeight;
  }
  window.addEventListener('resize', onResize);

  function drawGround() {
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, groundY, canvas.width, groundHeight);
  }

  function drawPet() {
    const key = pet.phase === 'healed' ? 'healed' : pet.phase === 'sick' ? 'sick' : 'normal';
    const img = getImg(key);
    if (!img) return;
    const x = petX() - PET_W / 2;
    const y = petY() - PET_H / 2;
    ctx.drawImage(img, x, y, PET_W, PET_H);
    if (typeof window.drawOutfitOverlay === 'function') window.drawOutfitOverlay(ctx, 'stand', x, y, PET_W, PET_H, 0);
  }

  function drawMedicine() {
    const x = medicine.x;
    const y = medicine.y;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x - PILL_R * 0.4, y, PILL_R, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + PILL_R * 0.4, y, PILL_R, Math.PI * 1.5, Math.PI * 0.5);
    ctx.fillStyle = '#fafafa';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - PILL_R);
    ctx.lineTo(x, y + PILL_R);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x - PILL_R - PILL_R * 0.4, y - PILL_R, (PILL_R + PILL_R * 0.4) * 2, PILL_R * 2, PILL_R);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.fillText('Medicine', x, y + PILL_R + 18);
    ctx.restore();
  }

  function drawHint() {
    const label = pet.phase === 'sick' ? '😷 Sick!' : pet.phase === 'healed' ? '💚 Healed!' : '';
    if (!label) return;
    ctx.save();
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = pet.phase === 'sick' ? '#ef4444' : '#22c55e';
    ctx.fillText(label, petX(), petY() - PET_H / 2 - 12);
    ctx.restore();
  }

  function checkHeal() {
    if (pet.phase !== 'sick') return;
    const dx = medicine.x - petX();
    const dy = medicine.y - petY();
    if (Math.sqrt(dx * dx + dy * dy) < 120) {
      pet.phase = 'healed';
      pet.healTimer = 120;
      if (window.PetStats && typeof window.PetStats.heal === 'function') window.PetStats.heal(0);
      medicine.x = canvas.width / 2;
      medicine.y = canvas.height * 0.25;
    }
  }

  let victoryTimer = 0;
  const VICTORY_FRAMES = 200;

  function drawVictory() {
    if (victoryTimer <= 0) return;
    const alpha = Math.min(1, victoryTimer / 40);
    const scale = 1 + 0.08 * Math.sin(victoryTimer * 0.15);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(canvas.width / 2, canvas.height * 0.38);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.roundRect(-130, -36, 260, 72, 36);
    ctx.fillStyle = 'rgba(34,197,94,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('🎉 Healed! 🎉', 0, 0);
    ctx.restore();
  }

  function update() {
    if (pet.phase === 'healed') {
      pet.healTimer--;
      if (pet.healTimer <= 0) pet.phase = 'healthy';
    }
    checkHeal();
    if (pet.phase === 'healthy' && victoryTimer === 0) victoryTimer = VICTORY_FRAMES;
    if (victoryTimer > 0) victoryTimer--;
  }

  let running = true;
  let raf = 0;
  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();
    drawGround();
    drawPet();
    drawHint();
    drawMedicine();
    drawVictory();
    raf = requestAnimationFrame(loop);
  }
  loop();

  window._modeCleanup = function () {
    running = false;
    cancelAnimationFrame(raf);
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('touchstart', onDown);
    canvas.removeEventListener('touchmove', onMove);
    canvas.removeEventListener('touchend', onUp);
    window.removeEventListener('resize', onResize);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
})();