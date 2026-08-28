/* ── Universal Stations v2 — Lecteur vocal d'article ──
   S'attache à un conteneur de texte + un point de montage et y injecte la
   pilule "Écouter cet article". Synthèse vocale native (gratuite, hors-ligne),
   surlignage phrase à phrase, vitesse réglable. Respecte prefers-reduced-motion.
   Réutilisable : plusieurs instances indépendantes peuvent coexister sur une
   même page (ex. le flipbook du magazine, un article par double-page). */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEEDS = [1, 1.25, 1.5, 0.85];
  let cancelAllOnUnload = false;

  function attach(art, mount, opts = {}) {
    if (!art || !mount || !('speechSynthesis' in window)) return null;
    const synth = speechSynthesis;

    mount.innerHTML = `
      <div class="voice" id="voice">
        <button class="v-play" aria-label="Écouter l'article">▶</button>
        <div class="v-mid">
          <div class="v-label">Écouter cet article
            <span class="v-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          </div>
          <div class="v-bar" aria-hidden="true"><i></i></div>
        </div>
        <span class="v-time"></span>
        <button class="v-speed" aria-label="Vitesse de lecture">1×</button>
      </div>`;
    const box = mount.querySelector('.voice');
    const play = box.querySelector('.v-play');
    const prog = box.querySelector('.v-bar i');
    const time = box.querySelector('.v-time');
    const speedBtn = box.querySelector('.v-speed');
    let speedIdx = 0, playing = false, idx = 0;

    /* découpe en phrases pour le surlignage */
    art.querySelectorAll('p, h2, h3, blockquote, li').forEach(p => {
      if (p.querySelector('.sent')) return; /* déjà découpé */
      if (p.querySelector('strong,em,a')) {
        p.innerHTML = `<span class="sent">${p.innerHTML}</span>`;
      } else {
        p.innerHTML = p.textContent.split(/(?<=[.!?…])\s+/).filter(Boolean)
          .map(s => `<span class="sent">${s}</span>`).join(' ');
      }
    });
    const sentences = [...art.querySelectorAll('.sent')];
    const totalWords = art.textContent.split(/\s+/).length;
    const mins = w => { const m = Math.max(1, Math.round(w / (160 * SPEEDS[speedIdx]))); return m + ' min'; };
    time.textContent = mins(totalWords);

    const voiceFR = () => synth.getVoices().find(v => v.lang.startsWith('fr')) || null;
    const speak = () => {
      if (idx >= sentences.length) { stop(); return; }
      sentences.forEach(s => s.classList.remove('said'));
      const el = sentences[idx];
      el.classList.add('said');
      if (!reduced) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      prog.style.width = (idx / sentences.length * 100) + '%';
      const left = sentences.slice(idx).reduce((n, s) => n + s.textContent.split(/\s+/).length, 0);
      time.textContent = mins(left);
      const u = new SpeechSynthesisUtterance(el.textContent);
      u.lang = 'fr-FR'; u.rate = SPEEDS[speedIdx];
      const v = voiceFR(); if (v) u.voice = v;
      u.onend = () => { if (playing) { idx++; speak(); } };
      synth.speak(u);
    };
    const stop = () => {
      if (!playing) return;
      playing = false; synth.cancel();
      box.classList.remove('playing'); play.textContent = '▶';
      sentences.forEach(s => s.classList.remove('said'));
      prog.style.width = '0%'; idx = 0; time.textContent = mins(totalWords);
    };
    play.addEventListener('click', () => {
      if (playing) { stop(); return; }
      opts.beforePlay?.();
      playing = true; box.classList.add('playing'); play.textContent = '❚❚';
      speak();
    });
    speedBtn.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      speedBtn.textContent = SPEEDS[speedIdx] + '×';
      if (playing) { synth.cancel(); speak(); }
    });
    if (!cancelAllOnUnload) {
      cancelAllOnUnload = true;
      addEventListener('beforeunload', () => synth.cancel());
    }
    return { stop, isPlaying: () => playing };
  }

  /* auto-attache sur les pages d'article standard */
  const art = document.getElementById('art-body');
  const mount = document.getElementById('voice-mount');
  if (art && mount) attach(art, mount);

  window.UniversalVoice = { attach };
})();
