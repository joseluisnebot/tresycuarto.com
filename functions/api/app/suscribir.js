const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};


async function sendWelcome(email, ciudad, brevoKey) {
  const body = {
    sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
    to: [{ email }],
    subject: "¡Ya estás dentro! 🍊 tresycuarto",
    htmlContent: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#FFF8EF;margin:0;padding:32px 16px">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:32px;border:1px solid #F5E6D3">
  <div style="font-size:1.4rem;font-weight:900;color:#1C1917;margin-bottom:24px">tres<span style="color:#FB923C">y</span>cuarto 🍊</div>
  <h1 style="font-size:1.3rem;font-weight:800;color:#1C1917;margin:0 0 12px">¡Bienvenido al tardeo!</h1>
  <p style="color:#57534E;line-height:1.6;margin:0 0 16px">
    Ya eres parte de tresycuarto. Te avisaremos de los mejores planes${ciudad ? ` en <strong>${ciudad}</strong>` : ""} para que no te pierdas nada.
  </p>
  <p style="color:#57534E;line-height:1.6;margin:0 0 24px">
    Mientras tanto, explora los mejores locales de tardeo en España:
  </p>
  <a href="https://tresycuarto.com" style="display:inline-block;background:#FB923C;color:white;font-weight:700;padding:12px 24px;border-radius:12px;text-decoration:none">
    Ver locales →
  </a>
  <p style="color:#A8A29E;font-size:0.78rem;margin-top:32px">
    Si no solicitaste este email, ignóralo. <a href="https://tresycuarto.com" style="color:#A8A29E">tresycuarto.com</a>
  </p>
</div>
</body></html>`,
  };
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": brevoKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function onRequestPost({ request, env, ctx }) {
  let email, ciudad;
  try {
    ({ email, ciudad } = await request.json());
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400, headers: CORS });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Email no válido" }, { status: 400, headers: CORS });
  }

  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      "INSERT INTO leads_app (email, ciudad, fuente, created_at) VALUES (?, ?, 'app', ?)"
    ).bind(email.toLowerCase().trim(), ciudad || null, now).run();
  } catch (e) {
    if (e.message?.includes("UNIQUE")) {
      return Response.json({ ok: true, msg: "Ya estás suscrito" }, { headers: CORS });
    }
    return Response.json({ error: "Error al guardar" }, { status: 500, headers: CORS });
  }

  await sendWelcome(email, ciudad, env.BREVO_API_KEY);
  return Response.json({ ok: true }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}
