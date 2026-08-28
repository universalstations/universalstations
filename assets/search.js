/* ── Universal Stations v2 — Recherche globale ──
   Bouton loupe dans la nav, overlay plein écran, résultats en direct :
   épisodes (RSS), exclusifs Spotify, articles, playlists. */
(() => {
  /* préfixe relatif : '' à la racine, '../' dans les sous-dossiers */
  const PRE = (document.querySelector('link[href$="assets/style.css"]')?.getAttribute('href') || '').replace('assets/style.css', '');

  /* ── bouton loupe dans la nav ── */
  const nav = document.querySelector('nav');
  if (!nav) return;
  const btn = document.createElement('button');
  btn.className = 'search-btn'; btn.setAttribute('aria-label', 'Rechercher');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="19" height="19" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>';
  nav.insertBefore(btn, nav.querySelector('.nav-cta'));

  /* ── overlay ── */
  const ov = document.createElement('div');
  ov.className = 'search-ov';
  ov.innerHTML = `
    <button class="so-close" aria-label="Fermer la recherche">✕</button>
    <div class="so-in">
      <label class="sr-only" for="so-q">Rechercher sur Universal Stations</label>
      <input id="so-q" type="search" placeholder="Un artiste, un épisode, un article…" autocomplete="off">
      <div id="so-res" aria-live="polite"></div>
    </div>`;
  document.body.appendChild(ov);
  const input = ov.querySelector('#so-q'), res = ov.querySelector('#so-res');

  const open = () => { ov.classList.add('open'); document.body.classList.add('noscroll'); setTimeout(() => input.focus(), 60); };
  const close = () => { ov.classList.remove('open'); document.body.classList.remove('noscroll'); };
  btn.addEventListener('click', open);
  ov.querySelector('.so-close').addEventListener('click', close);
  addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); }
  });

  /* ── index ── */
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let episodes = null;

  const build = async () => {
    const idx = [];
    if (typeof USRSS !== 'undefined') {
      if (episodes === null) episodes = await USRSS.load();
      (episodes || []).forEach((it, i) => idx.push({
        type: 'Épisodes', t: it.title, s: it.season ? `Saison ${it.season} · ${USRSS.SEASONS[it.season]}` : '',
        url: PRE + 'episodes/episode.html?i=' + i,
      }));
      USRSS.PREMIUM.forEach(it => idx.push({
        type: 'Exclusifs Spotify', t: it.title, s: `Saison ${it.season} · ${USRSS.SEASONS[it.season]}`,
        url: it.link, ext: true,
      }));
      Object.entries(USRSS.PLAYLISTS).forEach(([n, p]) => idx.push({
        type: 'Playlists', t: `${p.name} · Saison ${n}`, s: USRSS.SEASONS[n],
        url: PRE + 'playlists/index.html',
      }));
    }
    if (typeof US_ARTICLES !== 'undefined') US_ARTICLES.forEach(a => idx.push({
      type: 'Magazine', t: a.t, s: a.tag,
      url: PRE + 'magazine/' + a.slug + '.html',
    }));
    return idx;
  };

  let index = null;
  const render = q => {
    if (!index) return;
    const nq = norm(q.trim());
    if (nq.length < 2) { res.innerHTML = '<p class="so-hint">Tape au moins deux lettres — épisodes, exclusifs, articles, playlists.</p>'; return; }
    const hits = index.filter(it => norm(it.t + ' ' + it.s).includes(nq)).slice(0, 24);
    if (!hits.length) { res.innerHTML = `<p class="so-hint">Aucun résultat pour « ${esc(q)} ».</p>`; return; }
    const groups = {};
    hits.forEach(h => (groups[h.type] = groups[h.type] || []).push(h));
    res.innerHTML = Object.entries(groups).map(([type, list]) => `
      <p class="so-group">${type}</p>
      ${list.map(h => `<a class="so-hit" href="${esc(h.url)}"${h.ext ? ' target="_blank" rel="noopener"' : ''}>
        <b>${esc(h.t)}</b><span>${esc(h.s)}${h.ext ? ' ↗' : ''}</span></a>`).join('')}
    `).join('');
  };

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('focus', async () => { if (!index) { index = await build(); render(input.value); } });
})();
