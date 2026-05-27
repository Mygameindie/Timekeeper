// ===========================================================
// 🎤 KARAOKE MODE — Single pet
// ===========================================================
(() => {
  if (typeof window._modeCleanup === 'function') {
    try { window._modeCleanup(); } catch (_) {}
  }

  window._modeName = 'karaoke';
  window.activePetIndex = 0;
  window.setActivePet = function () { window.activePetIndex = 0; };

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  let lastFit = null;
  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches && e.touches[0] ? e.touches[0] : e;
    return { x: (t.clientX || 0) - rect.left, y: (t.clientY || 0) - rect.top };
  }
  function selectPetAt(e) {
    if (!lastFit) return;
    const p = getPointerPos(e);
    if (p.x >= lastFit.x && p.x <= lastFit.x + lastFit.w && p.y >= lastFit.y && p.y <= lastFit.y + lastFit.h) window.setActivePet(0);
  }
  canvas.addEventListener('mousedown', selectPetAt, { passive: true });
  canvas.addEventListener('touchstart', selectPetAt, { passive: true });

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const petImgs = { a: new Image(), b: new Image(), current: null, toggle: false };
  petImgs.a.src = 'base_music1.png';
  petImgs.b.src = 'base_music2.png';
  petImgs.current = petImgs.a;

  let rafId = 0;
  let danceInterval = null;

  function imgOk(img) { return img && img.complete && img.naturalWidth > 0; }
  function getFit() {
    const w = 400;
    const h = 450;
    return { x: canvas.width * 0.5 - w / 2, y: canvas.height - h - 80, w, h };
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = imgOk(petImgs.current) ? petImgs.current : petImgs.a;
    if (imgOk(img)) {
      const t = getFit();
      lastFit = t;
      ctx.drawImage(img, t.x, t.y, t.w, t.h);
      if (window.drawOutfitOverlay) window.drawOutfitOverlay(ctx, 'stand', t.x, t.y, t.w, t.h, 0);
    }
    rafId = requestAnimationFrame(loop);
  }
  petImgs.a.onload = loop;
  loop();

  function startDance() {
    clearInterval(danceInterval);
    danceInterval = setInterval(() => {
      if (!imgOk(petImgs.b)) {
        petImgs.current = petImgs.a;
        petImgs.toggle = false;
        return;
      }
      petImgs.current = petImgs.toggle ? petImgs.a : petImgs.b;
      petImgs.toggle = !petImgs.toggle;
    }, 400);
  }

  function stopDance() {
    clearInterval(danceInterval);
    danceInterval = null;
    petImgs.toggle = false;
    petImgs.current = petImgs.a;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*,video/*';
  input.style.display = 'none';
  document.body.appendChild(input);

  const uploadBtn = document.createElement('button');
  uploadBtn.textContent = '🎵 Upload Song';
  Object.assign(uploadBtn.style, {
    position: 'fixed', top: '20px', right: '20px', zIndex: '10000', background: '#ff4d6d', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '16px', cursor: 'pointer'
  });
  document.body.appendChild(uploadBtn);
  uploadBtn.addEventListener('click', e => { e.stopPropagation(); input.value = ''; input.click(); });

  const progressContainer = document.createElement('div');
  Object.assign(progressContainer.style, { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px', overflow: 'hidden', display: 'none', zIndex: '9999' });
  const progressBar = document.createElement('div');
  Object.assign(progressBar.style, { height: '100%', width: '0%', background: 'linear-gradient(90deg, #00bfff, #ff00ff)' });
  progressContainer.appendChild(progressBar);
  document.body.appendChild(progressContainer);

  const timeLabel = document.createElement('div');
  Object.assign(timeLabel.style, { position: 'fixed', bottom: '35px', left: '50%', transform: 'translateX(-50%)', color: 'white', fontSize: '14px', display: 'none', zIndex: '9999', textShadow: '0 1px 2px rgba(0,0,0,0.6)', fontFamily: 'Arial, sans-serif' });
  document.body.appendChild(timeLabel);

  const playBtn = document.createElement('button');
  playBtn.textContent = '⏸️ Pause';
  Object.assign(playBtn.style, { position: 'fixed', bottom: '40px', right: '20px', zIndex: '10000', display: 'none', background: 'rgba(255,255,255,0.5)', border: '2px solid #999', borderRadius: '10px', padding: '10px 15px', fontSize: '18px', cursor: 'pointer' });
  document.body.appendChild(playBtn);

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  }

  function showTapOverlay(onTap) {
    const overlay = document.createElement('div');
    overlay.textContent = '🎬 Tap to start playback';
    Object.assign(overlay.style, { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '20000', cursor: 'pointer', userSelect: 'none' });
    document.body.appendChild(overlay);
    const handler = async () => {
      try { await onTap(); } catch (_) {}
      try { overlay.remove(); } catch (_) {}
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });
  }

  let mediaPlayer = null;
  let progressTimer = null;
  let isPaused = false;

  function stopAudio() {
    clearInterval(progressTimer);
    progressTimer = null;
    stopDance();
    if (mediaPlayer) {
      try { mediaPlayer.pause(); } catch (_) {}
      try { mediaPlayer.remove(); } catch (_) {}
      mediaPlayer = null;
    }
    progressContainer.style.display = 'none';
    playBtn.style.display = 'none';
    timeLabel.style.display = 'none';
    progressBar.style.width = '0%';
    timeLabel.textContent = '0:00 / 0:00';
    playBtn.textContent = '⏸️ Pause';
    isPaused = false;
  }

  function startProgress() {
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      if (!mediaPlayer) return;
      const dur = mediaPlayer.duration;
      const cur = mediaPlayer.currentTime;
      if (isFinite(dur) && dur > 0) {
        progressBar.style.width = ((cur / dur) * 100) + '%';
        timeLabel.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
      } else timeLabel.textContent = `${formatTime(cur)} / 0:00`;
    }, 100);
  }

  playBtn.addEventListener('click', () => {
    if (!mediaPlayer) return;
    if (!isPaused) {
      mediaPlayer.pause();
      playBtn.textContent = '▶️ Play';
      stopDance();
      isPaused = true;
    } else {
      mediaPlayer.play().then(() => {
        playBtn.textContent = '⏸️ Pause';
        startDance();
        isPaused = false;
      }).catch(() => showTapOverlay(() => mediaPlayer.play().then(() => { playBtn.textContent = '⏸️ Pause'; startDance(); isPaused = false; })));
    }
  });

  input.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    stopAudio();
    const url = URL.createObjectURL(file);
    mediaPlayer = document.createElement('audio');
    mediaPlayer.src = url;
    mediaPlayer.style.display = 'none';
    mediaPlayer.volume = 0.9;
    document.body.appendChild(mediaPlayer);
    progressContainer.style.display = 'block';
    playBtn.style.display = 'block';
    timeLabel.style.display = 'block';
    playBtn.textContent = '⏸️ Pause';
    isPaused = false;
    startProgress();
    if (window.PetStats) window.PetStats.karaoke(0);
    try {
      await mediaPlayer.play();
      startDance();
    } catch (_) {
      playBtn.textContent = '▶️ Play';
      isPaused = true;
      stopDance();
      showTapOverlay(async () => { await mediaPlayer.play(); playBtn.textContent = '⏸️ Pause'; isPaused = false; startDance(); });
    }
    mediaPlayer.onended = stopAudio;
  });

  window._modeCleanup = function () {
    stopAudio();
    cancelAnimationFrame(rafId);
    clearInterval(danceInterval);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('mousedown', selectPetAt);
    canvas.removeEventListener('touchstart', selectPetAt);
    try { input.remove(); uploadBtn.remove(); progressContainer.remove(); playBtn.remove(); timeLabel.remove(); } catch (_) {}
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
})();