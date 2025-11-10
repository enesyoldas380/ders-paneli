// api/send.js
// Vercel serverless function: WhatsApp mesajlarını gönderir

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  const { messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ ok: false, error: "No messages in body" });
    return;
  }

  const token = process.env.WABA_TOKEN;
  const phoneId = process.env.WABA_PHONE_ID;

  // Güvenlik: Env yoksa GERÇEK GÖNDERME, sadece simülasyon
  if (!token || !phoneId) {
    console.log("[send] TEST MODU, env yok. Gelen mesajlar:", messages);
    res.status(200).json({
      ok: true,
      mode: "test",
      sent: messages.length,
      results: messages.map((m) => ({ to: m.to, ok: true, test: true })),
    });
    return;
  }

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const results = [];

  for (const m of messages) {
    const rawTo = String(m.to || "").trim();
    const text = String(m.text || "").trim();

    if (!rawTo || !text) {
      results.push({ to: rawTo, ok: false, error: "missing to/text" });
      continue;
    }

    // UK için küçük normalizasyon: 07... -> +44..., başında + yoksa +44 ekle
    let to = rawTo;
    if (to.startsWith("07")) {
      to = "+44" + to.slice(1);
    } else if (/^\d+$/.test(to)) {
      // sadece rakamsa
      to = "+44" + to;
    }

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error("[send] WhatsApp API error", to, data);
        results.push({
          to,
          ok: false,
          error: data.error || data,
        });
      } else {
        results.push({
          to,
          ok: true,
          responseId: data.messages?.[0]?.id,
        });
      }
    } catch (err) {
      console.error("[send] fetch exception", to, err);
      results.push({ to, ok: false, error: String(err) });
    }
  }

  res.status(200).json({
    ok: true,
    mode: "live",
    sent: results.filter((r) => r.ok).length,
    results,
  });
}
