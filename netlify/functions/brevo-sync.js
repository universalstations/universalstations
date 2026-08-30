// ══════════════════════════════════════════════════════════
// Universal Stations — Synchronisation Brevo
// Reçoit les notifications de soumission de formulaire Netlify
// (newsletter + précommande livre) et ajoute le contact dans
// la liste Brevo correspondante.
// Nécessite la variable d'environnement BREVO_API_KEY (Netlify
// dashboard → Site configuration → Environment variables).
// ══════════════════════════════════════════════════════════

const LISTS = {
  newsletter: 3,
  'book-precommande': 4,
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const payload = body.payload || body;
    const data = payload.data || {};
    const formName = payload.form_name || data['form-name'];

    const listId = LISTS[formName];
    if (!listId) {
      return { statusCode: 200, body: 'Ignored: unknown form' };
    }

    const email = data.email;
    if (!email) {
      return { statusCode: 400, body: 'Missing email' };
    }

    const attributes = {};
    if (data.format) attributes.FORMAT = data.format;

    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true,
        attributes,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { statusCode: 502, body: `Erreur Brevo : ${text}` };
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 500, body: `Erreur : ${err.message}` };
  }
};
