// api/send.js
// WhatsApp Cloud API - şimdilik hello_world template ile gönderim

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

  const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;
  const results = [];

  for (const m of messages) {
    const rawTo = String(m.to || "").trim();

    if (!rawTo) {
      results.push({ to: rawTo, ok: false, error: "missing to" });
      continue;
    }

    // numarayı uluslararası formata getir (template örneğiyle uyumlu)
    let digits = rawTo.replace(/\D/g, "");

    if (digits.startsWith("0")) {
      digits = "44" + digits.slice(1);
    }
    if (!digits.startsWith("44")) {
      digits = "44" + digits;
    }

    const to = digits;

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
          type: "template",
          template: {
            name: "hello_world",
            language: { code: "en_US" },
          },
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error("[send] WhatsApp API error", to, data);
        results.push({ to, ok: false, error: data.error || data });
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
    mode: "live-template",
    sent: sentOk,
    results,
    error: firstError,
  });
}
