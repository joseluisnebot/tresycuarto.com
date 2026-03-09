async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(n = 16) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }

  const { token, password } = body;

  if (!token || !password) return Response.json({ error: "Faltan campos" }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });

  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    "SELECT id FROM usuarios WHERE reset_token = ? AND reset_expires > ?"
  ).bind(token, now).all();

  if (!results.length) {
    return Response.json({ error: "El enlace no es válido o ha expirado" }, { status: 400 });
  }

  const userId = results[0].id;
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);

  // Actualizar contraseña, limpiar token de reset e invalidar todas las sesiones
  await env.DB.prepare(
    "UPDATE usuarios SET password_hash = ?, salt = ?, reset_token = NULL, reset_expires = NULL, session_token = NULL, session_expires = NULL WHERE id = ?"
  ).bind(passwordHash, salt, userId).run();

  return Response.json({ ok: true });
}
