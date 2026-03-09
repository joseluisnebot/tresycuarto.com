async function verifyTurnstile(token, secret, ip) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}&remoteip=${ip}`,
  });
  const data = await res.json();
  return data.success === true;
}

function randomHex(n = 32) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }

  const { email, cf_token } = body;
  if (!email) return Response.json({ error: "Falta el email" }, { status: 400 });

  // Verificar Turnstile
  if (env.TURNSTILE_SECRET) {
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const ok = await verifyTurnstile(cf_token || "", env.TURNSTILE_SECRET, ip);
    if (!ok) return Response.json({ error: "Verificación fallida, inténtalo de nuevo" }, { status: 403 });
  }

  // Buscar cuenta — respuesta idéntica tanto si existe como si no (evita enumeración)
  const { results } = await env.DB.prepare("SELECT id, email FROM usuarios WHERE email = ?").bind(email.toLowerCase().trim()).all();
  if (!results.length) return Response.json({ ok: true }); // No revelar que no existe

  const user = results[0];
  const resetToken = randomHex(32); // 64 chars hex
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

  await env.DB.prepare("UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE id = ?")
    .bind(resetToken, expires, user.id).run();

  const resetUrl = `https://tresycuarto.com/local/reset?token=${resetToken}`;

  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
        to: [{ email: user.email }],
        subject: "Recupera tu contraseña — tresycuarto",
        htmlContent: `
          <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#FFF8EF">
            <p style="font-size:1.5rem;font-weight:800;color:#1C1917;margin:0 0 1.5rem">tres<span style="color:#FB923C">y</span>cuarto</p>
            <h2 style="color:#1C1917;margin:0 0 0.75rem">Recuperar contraseña</h2>
            <p style="color:#78716C;margin:0 0 1.5rem">Haz clic en el siguiente botón para establecer una nueva contraseña. El enlace es válido durante <strong>1 hora</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;padding:0.9rem 2rem;background:linear-gradient(135deg,#FB923C,#F59E0B);color:white;font-weight:700;text-decoration:none;border-radius:0.75rem;margin-bottom:1.5rem">
              Cambiar contraseña →
            </a>
            <p style="color:#A8A29E;font-size:0.8rem;margin:0">Si no has solicitado este cambio, ignora este email. Tu contraseña no se modificará.</p>
          </div>`,
      }),
    });
  } catch { /* silencioso */ }

  return Response.json({ ok: true });
}
