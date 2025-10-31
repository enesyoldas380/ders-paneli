// Vercel Serverless Function: /api/send
// Env: WABA_TOKEN, WABA_PHONE_ID  (Vercel -> Settings -> Environment Variables)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages boş' });
  }

  const token = process.env.WABA_TOKEN;
  const phoneId = process.env.WABA_PHONE_ID;

  // Test modu: env yoksa gönderim simülasyonu yap
  if (!token || !phoneId) {
    console.warn('WABA_TOKEN veya WABA_PHONE_ID tanımlı değil. Test modunda döndüm.');
    return res.status(200).json({ ok: true, mode: 'test', count: messages.length });
  }

  // WhatsApp Business Cloud API
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

  const results = [];
  for (const m of messages) {
    const to = normalizePhone(m.to);
    const body = (m.text || '').slice(0, 4096); // WhatsApp limit güvenliği

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { preview_url: false, body }
        })
      });
      const data = await r.json();
      if (!r.ok) {
        results.push({ to, ok: false, error: data?.error || data });
      } else {
        results.push({ to, ok: true, id: data?.messages?.[0]?.id });
      }
      // küçük gecikme, rate-limit nazikliği
      await new Promise(s => setTimeout(s, 120));
    } catch (e) {
      results.push({ to, ok: false, error: e?.message || e });
    }
  }

  const okCount = results.filter(x => x.ok).length;
  return res.status(200).json({ ok: true, sent: okCount, results });
}

function normalizePhone(input) {
  if (!input) return '';
  let s = ('' + input).trim();
  // boşluk ve tire temizle
  s = s.replace(/[()\s-]/g, '');
  // + ile başlamıyorsa ve 0 ile başlıyorsa → UK varsayımı +44
  if (!s.startsWith('+')) {
    if (s.startsWith('0')) s = '+44' + s.slice(1);
    else if (/^\d+$/.test(s)) s = '+' + s; // zaten uluslararası olabilir
  }
  return s;
}
