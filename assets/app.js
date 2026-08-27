/* ── Universal Stations v2 — animations partagées ──
   Compteurs, révélations au scroll (y compris contenu dynamique),
   lecteur démo. Tout respecte prefers-reduced-motion. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Révélations au scroll (.rv) + volets images (.imgw) ── */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('on');
    io.unobserve(e.target);
  }), { threshold: 0.12 });

  const watch = root => {
    root.querySelectorAll?.('.rv:not(.on), .imgw:not(.on)').forEach(el => {
      if (reduced) { el.classList.add('on'); return; }
      io.observe(el);
    });
  };
  watch(document);

  /* contenu injecté en JS (grille d'épisodes, page épisode…) */
  new MutationObserver(muts => muts.forEach(m =>
    m.addedNodes.forEach(n => { if (n.nodeType === 1) watch(n); })
  )).observe(document.body, { childList: true, subtree: true });

  /* ── 2. Compteurs animés (.hs b) ── */
  const ease = t => 1 - Math.pow(1 - t, 3);
  const count = el => {
    const target = parseInt(el.textContent.replace(/\D/g, ''));
    if (isNaN(target) || reduced) return;
    const suffix = el.textContent.replace(/[\d\s]/g, '');
    const t0 = performance.now(), DUR = 1400;
    const tick = now => {
      const p = Math.min((now - t0) / DUR, 1);
      el.textContent = Math.round(ease(p) * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const ioC = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    count(e.target);
    ioC.unobserve(e.target);
  }), { threshold: 0.6 });
  document.querySelectorAll('.hs b').forEach(el => ioC.observe(el));

  /* ── 3. Lecteur (accueil) — lit le dernier épisode via le flux RSS ── */
  const pl = document.querySelector('.player');
  if (pl) {
    const bt = pl.querySelector('.pp');
    const cover = pl.querySelector('.cover');
    const titleEl = pl.querySelector('.pt');
    const timeEl = pl.querySelector('.time');
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    pl.appendChild(audio);

    const fmt = s => {
      if (!isFinite(s) || s < 0) return '';
      const m = Math.floor(s / 60), sec = Math.floor(s % 60);
      return m + ':' + String(sec).padStart(2, '0');
    };

    audio.addEventListener('loadedmetadata', () => { timeEl.textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', () => { timeEl.textContent = fmt(audio.duration - audio.currentTime); });
    audio.addEventListener('ended', () => {
      pl.classList.add('paused'); bt.textContent = '▶';
      timeEl.textContent = fmt(audio.duration);
    });

    bt.addEventListener('click', () => {
      if (!audio.src) return;
      if (pl.classList.contains('paused')) {
        audio.play().catch(() => {});
        pl.classList.remove('paused'); bt.textContent = '❚❚';
      } else {
        audio.pause();
        pl.classList.add('paused'); bt.textContent = '▶';
      }
    });

    /* rss.js est chargé en defer juste après ce script : on attend la fin
       du parsing pour être sûr que USRSS existe. */
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof USRSS === 'undefined') return;
      USRSS.load().then(items => {
        const ep = items?.[0];
        if (!ep) return;
        if (ep.audio) audio.src = ep.audio;
        if (ep.img) cover.src = ep.img;
        if (ep.title) titleEl.textContent = ep.title;
      }).catch(() => {});
    });
  }
})();


/* ── Bascule thème clair / sombre (mémorisée, prioritaire sur le système) ── */
(() => {
  const KEY = 'us-theme';
  const root = document.documentElement;
  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);

  const isDarkNow = () => {
    const t = root.getAttribute('data-theme');
    if (t === 'light') return false;
    if (t === 'dark') return true;
    return matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const nav = document.querySelector('nav');
  if (!nav) return;
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 14.6A8.2 8.2 0 0 1 9.4 3.8a8.2 8.2 0 1 0 10.8 10.8z"/></svg>';

  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  const paint = () => {
    const dark = isDarkNow();
    btn.innerHTML = dark ? SUN : MOON;
    btn.setAttribute('aria-label', dark ? 'Passer au thème clair' : 'Passer au thème sombre');
  };
  paint();
  nav.appendChild(btn);

  btn.addEventListener('click', () => {
    const next = isDarkNow() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch {}
    paint();
  });
})();


/* ── Menu mobile (construit automatiquement depuis la nav) ── */
(() => {
  const nav = document.querySelector('nav');
  const links = nav?.querySelector('.links');
  if (!nav || !links) return;
  let burger = nav.querySelector('.burger');
  if (!burger) {
    burger = document.createElement('button');
    burger.className = 'burger'; burger.setAttribute('aria-label', 'Menu');
    burger.innerHTML = '<span></span><span></span><span></span>';
    nav.appendChild(burger);
  }
  const menu = document.createElement('div');
  menu.className = 'mmenu'; menu.setAttribute('aria-label', 'Menu mobile');
  menu.innerHTML = links.innerHTML;
  const cta = nav.querySelector('.nav-cta');
  if (cta) menu.innerHTML += cta.outerHTML;
  const close = document.createElement('button');
  close.className = 'mclose'; close.textContent = '✕'; close.setAttribute('aria-label', 'Fermer le menu');
  document.body.append(menu, close);
  const toggle = open => {
    menu.classList.toggle('open', open);
    close.classList.toggle('show', open);
    document.body.classList.toggle('noscroll', open);
  };
  burger.addEventListener('click', () => toggle(true));
  close.addEventListener('click', () => toggle(false));
  menu.addEventListener('click', e => { if (e.target.tagName === 'A') toggle(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
})();


/* ── Piège à focus dans les overlays (recherche, menu mobile) ── */
addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const ov = document.querySelector('.search-ov.open, .mmenu.open');
  if (!ov) return;
  const scope = ov.classList.contains('mmenu') ? document : ov;
  const els = [...(ov.classList.contains('mmenu')
    ? [...ov.querySelectorAll('a'), document.querySelector('.mclose.show')]
    : ov.querySelectorAll('button, input, a'))].filter(el => el && el.offsetParent !== null);
  if (!els.length) return;
  const first = els[0], last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
