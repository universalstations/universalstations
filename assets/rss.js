/* ── Universal Stations v2, chargement du flux RSS ──
   Cascade : proxy maison (/api/rss) → fetch direct → proxies de secours.
   Cache sessionStorage 10 min pour navigation instantanée entre pages. */
const USRSS = (() => {
  const FEED = 'https://anchor.fm/s/10f73d178/podcast/rss';
  const KEY = 'usv2_feed', TTL = 10 * 60 * 1000;

  const strategies = [
    () => fetch('/api/rss'),
    () => fetch(FEED, { mode: 'cors' }),
    () => fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED)}`),
    () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(FEED)}`),
  ];

  const toXML = txt => {
    if (!txt) return null;
    if (txt.trim().startsWith('{')) {           /* réponse rss2json */
      try {
        const j = JSON.parse(txt);
        if (j.items) return { json: j };
        const x = j.contents ?? '';
        return x.includes('<rss') ? { xml: x } : null;
      } catch { return null; }
    }
    return txt.includes('<rss') ? { xml: txt } : null;
  };

  const parse = raw => {
    let items = [];
    if (raw.json) {
      items = raw.json.items.map(it => ({
        title: it.title, desc: it.description || '', date: it.pubDate,
        audio: it.enclosure?.link || '', link: it.link || '',
        img: it.thumbnail || raw.json.feed?.image || '',
        season: parseInt(it.itunes_season) || null, ep: parseInt(it.itunes_episode) || null,
      }));
    } else {
      const doc = new DOMParser().parseFromString(raw.xml, 'text/xml');
      const g = (el, sel) => el.getElementsByTagName(sel)[0]?.textContent || '';
      items = [...doc.querySelectorAll('item')].map(el => ({
        title: g(el, 'title'),
        desc: g(el, 'description'),
        date: g(el, 'pubDate'),
        audio: el.querySelector('enclosure')?.getAttribute('url') || '',
        link: g(el, 'link'),
        img: el.getElementsByTagName('itunes:image')[0]?.getAttribute('href') || '',
        season: parseInt(g(el, 'itunes:season')) || null,
        ep: parseInt(g(el, 'itunes:episode')) || null,
      }));
    }
    return items.filter(it => it.title).map(it => ({
      ...it,
      title: it.title.replace(/\s*\u2014\s*/g, ' \u00b7 '),
      desc: it.desc.replace(/\s*\u2014\s*/g, ', '),
    }));
  };

  const load = async () => {
    try {
      const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (c && Date.now() - c.t < TTL) return c.items;
    } catch {}
    for (const s of strategies) {
      try {
        const r = await s();
        if (!r.ok) continue;
        const raw = toXML(await r.text());
        if (!raw) continue;
        const items = parse(raw);
        if (items.length) {
          try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), items })); } catch {}
          return items;
        }
      } catch { /* stratégie suivante */ }
    }
    return null;
  };

  const stripHTML = s => { const d = document.createElement('div'); d.innerHTML = s; return d.textContent || ''; };
  const fdate = s => { try { return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };
  const SEASONS = { 1: 'Rap', 2: 'Pop', 3: 'Reggae', 4: 'RnB' };
  const PLAYLISTS = {
    1: { id: '3OmEq4Shr3SvNgWq9m8wgV', name: 'Nuance' },
    2: { id: '1nJf1uFnETKvIbK2f0i5V3', name: 'Caviar' },
    3: { id: '54is6RvS5F3thhUomIUPN0', name: 'Caramel' },
    4: { id: '6JdqN6rJ3DpmKSYkMipuCG', name: 'Lotus' },
  };
  const PREMIUM = [
  {
    "title": "Beyoncé, l'Impérialisme Culturel",
    "desc": "Houston, Destiny's Child, le monde entier. Beyoncé n'a pas suivi une trajectoire, elle en a imposé une nouvelle. L'épisode de clôture de la Saison 4.",
    "link": "https://open.spotify.com/episode/6Rx4UL3Bg7JW4uSGjuRaxu",
    "season": 4,
    "img": "https://i.scdn.co/image/ab6765630000ba8abc235a6a14772fcc16e906e5"
  },
  {
    "title": "Jhené Aiko, la Soul Thérapeutique",
    "desc": "Elle n'élève pas la voix, elle n'en a pas besoin. Jhené Aiko parle directement à l'endroit où tu gardes tes choses les plus fragiles.",
    "link": "https://open.spotify.com/episode/5mMqLdsEaPbquu1KzpyhWj",
    "season": 4,
    "img": "https://i.scdn.co/image/ab6765630000ba8a9b8885a3e11d0b31d3589ab4"
  },
  {
    "title": "Jason Derulo, l'Alchimiste des Hits et de la Révolution Digitale",
    "desc": "Il a appris l'opéra, il a conquis TikTok. Jason Derulo a toujours eu une longueur d'avance, un caméléon qui ne rentre dans aucune case.",
    "link": "https://open.spotify.com/episode/5lStToQB6qcDAB5nPzoyIS",
    "season": 4,
    "img": "https://i.scdn.co/image/ab6765630000ba8abc7baef4ea65095bfc94c725"
  },
  {
    "title": "Leon Thomas, l'Alchimiste du Rythme",
    "desc": "Il a produit pour SZA, Ariana Grande, Drake, son nom rarement en premier. L'architecte de l'ombre qui sort enfin de la lumière des autres.",
    "link": "https://open.spotify.com/episode/7x2KUSbJxtcrTzVeRfyczA",
    "season": 4,
    "img": "https://i.scdn.co/image/ab6765630000ba8a37318a84b29a58f1c1806d87"
  },
  {
    "title": "Coco Jones, la Puissance Vocale",
    "desc": "Aretha dans les enceintes, Whitney dans la voiture. Coco Jones a hérité des plus grandes voix, et ça s'entend à chaque note.",
    "link": "https://open.spotify.com/episode/7tPLBQQREOAyukUQLEkDb0",
    "season": 4,
    "img": "https://i.scdn.co/image/ab6765630000ba8acd988481dfdf0a829b559b9f"
  },
  {
    "title": "Chris Brown (L'Hybride R&B-Performance)",
    "desc": "De la Dance-Pop à l'Afrobeats, du chant au graffiti, Chris Brown a transformé le R&B en terrain d'expérimentation sans limites.",
    "link": "https://open.spotify.com/episode/3mEb4VY3PyR07LgAEKU093",
    "season": 4,
    "img": "https://i.scdn.co/image/ab6765630000ba8acc355a1b63d9ee0d228923e1"
  },
  {
    "title": "Giveon, le Baryton Envoûtant",
    "desc": "Il ouvre la bouche, la pièce s'arrête. La voix la plus reconnaissable du R&B, un baryton de Long Beach qui ramène la grâce des grands crooners.",
    "link": "https://open.spotify.com/episode/1V7eQVt9N8lCDZyGhzajZK",
    "season": 4,
    "img": "https://i.scdn.co/image/ab6765630000ba8ae16789194b1a61175f1c18e2"
  },
  {
    "title": "Lucky Daye, le Prince du Funk-Soul",
    "desc": "La Nouvelle-Orléans dans le sang, les cuivres dans l'âme. Lucky Daye est l'antidote à la tristesse du R&B, une soul festive et organique.",
    "link": "https://open.spotify.com/episode/50oydounkvU05h9aQB61Xs",
    "season": 4,
    "img": "https://i.scdn.co/image/ab6765630000ba8a2fa4327c7c18f96a227f8cfd"
  },
  {
    "title": "Patoranking (L'Afro-Reggae Solaire)",
    "desc": "Lagos parle patois jamaïcain. Kingston danse sur des percussions nigérianes. Patoranking a construit ce pont tout seul.",
    "link": "https://open.spotify.com/episode/72GcXpu5VxQipqLBDSgb0Y",
    "season": 3,
    "img": "https://www.universalstations.com/patoranking.avif"
  },
  {
    "title": "YG Marley (Le Phénomène Viral)",
    "desc": "Fils de Lauryn Hill. Petit-fils de Bob Marley. Et pourtant, il a trouvé son propre son.",
    "link": "https://open.spotify.com/episode/3QxllD21N2rOecDaP6epeT",
    "season": 3,
    "img": "https://www.universalstations.com/yg.avif"
  },
  {
    "title": "Jimmy Cliff (L'Ambassadeur Planétaire)",
    "desc": "1972. Un film. Une bande-son. Et le monde découvre Kingston, la vraie.",
    "link": "https://open.spotify.com/episode/38Wc0HoxS9QCjLFN3nW47h",
    "season": 3,
    "img": "https://www.universalstations.com/jimmy.avif"
  },
  {
    "title": "Stephen Marley (L'Alchimiste de l'Héritage)",
    "desc": "8 Grammy Awards. Producteur de ses frères et sœurs. Directeur musical de la famille. Le nom que tout le monde connaît sans vraiment le connaître.",
    "link": "https://open.spotify.com/episode/7iMvlRdN86fOrXxQybCPgC",
    "season": 3,
    "img": "https://www.universalstations.com/stephenmarley.avif"
  },
  {
    "title": "Shenseea (La Princesse Dancehall-Pop)",
    "desc": "Kingston. Vybz Kartel. Puis Kanye West. Shenseea n'a pas gravi les échelons, elle les a sautés.",
    "link": "https://open.spotify.com/episode/3ea94RffNAgPkHF5NByT7K",
    "season": 3,
    "img": "https://www.universalstations.com/shen.avif"
  },
  {
    "title": "Pix'L (Le Succès Mondial du Créole Réunionnais)",
    "desc": "La Réunion. Le créole. La soul. Et une voix qui a fini par résonner jusqu'au Casino de Paris.",
    "link": "https://open.spotify.com/episode/1wjFvSFDnh6ssu8s4csQEK",
    "season": 3,
    "img": "https://www.universalstations.com/pixl.avif"
  }
];
  return { load, stripHTML, fdate, SEASONS, PLAYLISTS, PREMIUM };
})();
