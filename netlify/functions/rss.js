// ══════════════════════════════════════════════════════════
// Universal Stations — Proxy RSS (Netlify Function)
// Va chercher le flux RSS du podcast côté serveur (pas de CORS)
// et le renvoie au navigateur avec 5 min de cache CDN.
// Accessible via /api/rss (règle dans _redirects)
// ══════════════════════════════════════════════════════════

const FEED_URL = 'https://anchor.fm/s/10f73d178/podcast/rss';

exports.handler = async () => {
  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'UniversalStations-Site/1.0' },
    });

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: `Flux RSS indisponible (HTTP ${res.status})`,
      };
    }

    const xml = await res.text();

    // Sécurité minimale : on ne renvoie que si ça ressemble à du RSS
    if (!xml.includes('<rss') && !xml.includes('<feed')) {
      return {
        statusCode: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: 'Réponse inattendue du flux RSS',
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        // Cache CDN Netlify : 5 min (les visiteurs suivants ne déclenchent
        // pas la fonction), navigateur : 1 min
        'Netlify-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Cache-Control': 'public, max-age=60',
      },
      body: xml,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: `Erreur proxy RSS : ${err.message}`,
    };
  }
};
