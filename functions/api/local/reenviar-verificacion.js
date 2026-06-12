// POST /api/local/reenviar-verificacion — reenvía el email de verificación al dueño autenticado.
function randomHex(n = 24) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sendVerificationEmail(env, email, verifyToken) {
  const verifyUrl = `https://tresycuarto.com/local/verificar?token=${verifyToken}`;
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
      to: [{ email }],
      subject: "Confirma tu email en tresycuarto",
      htmlContent: `
        <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#FFF8EF">
          <p style="font-size:1.5rem;font-weight:800;color:#1C1917">tres<span style="color:#FB923C">y</span>cuarto</p>
          <h2 style="color:#1C1917">Confirma tu email</h2>
          <p style="color:#78716C">Haz clic para confirmar tu email y poder gestionar tu ficha:</p>
          <a href="${verifyUrl}" style="display:inline-block;margin:1rem 0;padding:0.9rem 2rem;background:linear-gradient(135deg,#FB923C,#F59E0B);color:white;font-weight:700;text-decoration:none;border-radius:0.75rem">
            Confirmar email →
          </a>
          <p style="color:#A8A29E;font-size:0.8rem">Si no has creado esta cuenta, ignora este email.</p>
        </div>`,
    }),
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });

  const now = new Date().toISOString();
  const { results: users } = await env.DB.prepare(
    "SELECT * FROM usuarios WHERE session_token = ? AND session_expires > ?"
  ).bind(token, now).all();
  if (!users.length) return Response.json({ error: "No autorizado" }, { status: 401 });

  const user = users[0];
  if (user.verified) return Response.json({ ok: true, already: true });

  let vt = user.verify_token;
  if (!vt) {
    vt = randomHex(24);
    await env.DB.prepare("UPDATE usuarios SET verify_token = ? WHERE id = ?").bind(vt, user.id).run();
  }

  try {
    if (env.BREVO_API_KEY) await sendVerificationEmail(env, user.email, vt);
  } catch { /* silencioso */ }

  return Response.json({ ok: true });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
