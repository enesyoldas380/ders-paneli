// api/send.js
// WhatsApp Cloud API ile toplu mesaj gönderimi

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

  // Env yoksa asla gerçek gönderim yapma, sadece test modu
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

    // --- NUMARA FORMATLAMA ---
    // Sadece rakamları bırak ( +, boşluk vs. temizle)
    let digits = rawTo.replace(/\D/g, "");

    // Örn: 07... yazılırsa -> 44... yap
    if (digits.startsWith("0")) {
      digits = "44" + digits.slice(1);
    }

    // Ülke kodu yoksa (çok basit kontrol)
    if (!digits.startsWith("44")) {
      digits = "44" + digits;
    }

    const to = digits; // WhatsApp Cloud: + işareti olmadan uluslararası format

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

  const sentOk = results.filter((r) => r.ok).length;
  const firstError = results.find((r) => !r.ok)?.error || null;

  res.status(sentOk > 0 ? 200 : 400).json({
    ok: sentOk > 0,
    mode: "live",
    sent: sentOk,
    results,
    error: firstError,
  });
}
