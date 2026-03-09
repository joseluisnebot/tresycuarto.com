// Hash password con PBKDF2 (Web Crypto — disponible en CF Workers)
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

function generateSlug(nombre, ciudad) {
  const norm = s => s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim().replace(/\s+/g, "-");
  return `${norm(nombre)}-${norm(ciudad)}`.slice(0, 60);
}

function sessionExpires() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

async function verifyTurnstile(token, secret, ip) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}&remoteip=${ip}`,
  });
  const data = await res.json();
  return data.success === true;
}

async function sendVerificationEmail(env, email, verifyToken, nombre) {
  const verifyUrl = `https://tresycuarto.com/local/verificar?token=${verifyToken}`;
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
        to: [{ email }],
        subject: "Confirma tu cuenta en tresycuarto",
        htmlContent: `
          <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:2rem;background:#FFF8EF">
            <p style="font-size:1.5rem;font-weight:800;color:#1C1917">tres<span style="color:#FB923C">y</span>cuarto</p>
            <h2 style="color:#1C1917">Confirma tu email</h2>
            <p style="color:#78716C">Hola, ya tienes tu cuenta de propietario para <strong>${nombre}</strong>.</p>
            <p style="color:#78716C">Haz clic para confirmar tu email:</p>
            <a href="${verifyUrl}" style="display:inline-block;margin:1rem 0;padding:0.9rem 2rem;background:linear-gradient(135deg,#FB923C,#F59E0B);color:white;font-weight:700;text-decoration:none;border-radius:0.75rem">
              Confirmar email →
            </a>
            <p style="color:#A8A29E;font-size:0.8rem">Si no has creado esta cuenta, ignora este email.</p>
          </div>`,
      }),
    });
  } catch { /* silencioso */ }
}

// getAuthUser: busca sesión en usuarios + usuario_locales
// local_id se toma de la cabecera X-Local-Id (si hay varios locales)
async function getAuthUser(env, request) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const now = new Date().toISOString();

  const { results: users } = await env.DB.prepare(
    "SELECT * FROM usuarios WHERE session_token = ? AND session_expires > ?"
  ).bind(token, now).all();
  if (!users.length) return null;
  const user = users[0];

  const localId = request.headers.get("X-Local-Id");
  let ulStmt;
  if (localId) {
    ulStmt = env.DB.prepare("SELECT * FROM usuario_locales WHERE usuario_id = ? AND local_id = ?").bind(user.id, localId);
  } else {
    ulStmt = env.DB.prepare("SELECT * FROM usuario_locales WHERE usuario_id = ? LIMIT 1").bind(user.id);
  }
  const { results: uls } = await ulStmt.all();
  if (!uls.length) return null;
  const ul = uls[0];

  return {
    id: user.id,
    ul_id: ul.id,
    email: user.email,
    password_hash: user.password_hash,
    salt: user.salt,
    verified: user.verified,
    verify_token: user.verify_token,
    local_id: ul.local_id,
    slug: ul.slug,
    plan: ul.plan || "trial",
    trial_inicio: ul.trial_inicio,
    plan_expires: ul.plan_expires,
    stripe_customer_id: ul.stripe_customer_id,
    stripe_subscription_id: ul.stripe_subscription_id,
  };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { results: locales } = await env.DB.prepare(
    "SELECT id, nombre, tipo, ciudad, direccion, telefono, web, instagram, horario, terraza, descripcion, foto_perfil, slug FROM locales WHERE id = ?"
  ).bind(user.local_id).all();
  const local = locales[0] || null;

  // Lista de todos los locales del usuario (para selector)
  const { results: userLocales } = await env.DB.prepare(
    "SELECT ul.local_id, ul.slug, l.nombre, l.ciudad FROM usuario_locales ul LEFT JOIN locales l ON l.id = ul.local_id WHERE ul.usuario_id = ? ORDER BY ul.created_at ASC"
  ).bind(user.id).all();

  return Response.json({
    id: user.id,
    local_id: user.local_id,
    email: user.email,
    plan: user.plan,
    trial_inicio: user.trial_inicio,
    plan_expires: user.plan_expires || null,
    slug: user.slug,
    verified: user.verified === 1,
    local,
    locales: userLocales,
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }

  const { action, email, password, local_id, cf_token } = body;

  // add_local no necesita email/password — el usuario ya está autenticado
  if (action !== "add_local") {
    if (!action || !email || !password) {
      return Response.json({ error: "Faltan campos" }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }
    // Verificar Turnstile en registro (no en login)
    if (action !== "login" && env.TURNSTILE_SECRET) {
      const ip = request.headers.get("CF-Connecting-IP") || "";
      const ok = await verifyTurnstile(cf_token || "", env.TURNSTILE_SECRET, ip);
      if (!ok) return Response.json({ error: "Verificación fallida, inténtalo de nuevo" }, { status: 403 });
    }
  }

  // --- REGISTER ---
  if (action === "register") {
    if (!local_id) return Response.json({ error: "Falta local_id" }, { status: 400 });

    // Verificar que el local existe
    const { results: locales } = await env.DB.prepare("SELECT id, nombre, ciudad FROM locales WHERE id = ?").bind(local_id).all();
    if (!locales.length) return Response.json({ error: "Local no encontrado" }, { status: 404 });
    const local = locales[0];

    // Verificar que el local no esté ya reclamado
    const { results: existing } = await env.DB.prepare("SELECT id FROM usuario_locales WHERE local_id = ?").bind(local_id).all();
    if (existing.length) return Response.json({ error: "Este local ya tiene una cuenta registrada" }, { status: 409 });

    // Verificar email único
    const { results: emailExists } = await env.DB.prepare("SELECT id FROM usuarios WHERE email = ?").bind(email).all();
    if (emailExists.length) return Response.json({ error: "Este email ya tiene una cuenta" }, { status: 409 });

    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const sessionToken = randomHex(32);
    const expires = sessionExpires();

    // Generar slug único
    let slug = generateSlug(local.nombre, local.ciudad);
    const { results: slugExists } = await env.DB.prepare("SELECT id FROM usuario_locales WHERE slug = ?").bind(slug).all();
    if (slugExists.length) slug = `${slug}-${randomHex(3)}`;

    const verifyToken = randomHex(24);

    // Crear usuario
    const { meta: userMeta } = await env.DB.prepare(
      "INSERT INTO usuarios (email, password_hash, salt, session_token, session_expires, verify_token, verified) VALUES (?, ?, ?, ?, ?, ?, 0)"
    ).bind(email, passwordHash, salt, sessionToken, expires, verifyToken).run();
    const userId = userMeta.last_row_id;

    // Crear relación usuario-local
    await env.DB.prepare(
      "INSERT INTO usuario_locales (usuario_id, local_id, slug, trial_inicio) VALUES (?, ?, ?, datetime('now'))"
    ).bind(userId, local_id, slug).run();

    // Marcar el local como claimed y guardar slug
    await env.DB.prepare("UPDATE locales SET claimed = 1, slug = ? WHERE id = ?").bind(slug, local_id).run();

    await sendVerificationEmail(env, email, verifyToken, local.nombre);

    return Response.json({ ok: true, token: sessionToken, slug, local_id, email });
  }

  // --- REGISTER NEW (local no existe en DB) ---
  if (action === "register_new") {
    const { nombre, tipo, ciudad, direccion, telefono, web, instagram } = body;
    if (!nombre || !ciudad) return Response.json({ error: "Nombre y ciudad son obligatorios" }, { status: 400 });

    // Verificar email único
    const { results: emailExists } = await env.DB.prepare("SELECT id FROM usuarios WHERE email = ?").bind(email).all();
    if (emailExists.length) return Response.json({ error: "Este email ya tiene una cuenta" }, { status: 409 });

    const newLocalId = `b2b_${randomHex(8)}`;
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const sessionToken = randomHex(32);
    const expires = sessionExpires();

    // Generar slug único
    let slug = generateSlug(nombre, ciudad);
    const { results: slugExists } = await env.DB.prepare("SELECT id FROM usuario_locales WHERE slug = ?").bind(slug).all();
    if (slugExists.length) slug = `${slug}-${randomHex(3)}`;

    // Insertar el local nuevo en la tabla locales
    await env.DB.prepare(
      "INSERT INTO locales (id, nombre, tipo, ciudad, direccion, telefono, web, instagram, fuente, claimed, slug, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'b2b', 1, ?, datetime('now'))"
    ).bind(newLocalId, nombre, tipo || "bar", ciudad, direccion || null, telefono || null, web || null, instagram || null, slug).run();

    // Crear usuario
    const verifyToken = randomHex(24);
    const { meta: userMeta } = await env.DB.prepare(
      "INSERT INTO usuarios (email, password_hash, salt, session_token, session_expires, verify_token, verified) VALUES (?, ?, ?, ?, ?, ?, 0)"
    ).bind(email, passwordHash, salt, sessionToken, expires, verifyToken).run();
    const userId = userMeta.last_row_id;

    // Crear relación usuario-local
    await env.DB.prepare(
      "INSERT INTO usuario_locales (usuario_id, local_id, slug, trial_inicio) VALUES (?, ?, ?, datetime('now'))"
    ).bind(userId, newLocalId, slug).run();

    await sendVerificationEmail(env, email, verifyToken, nombre);

    return Response.json({ ok: true, token: sessionToken, slug, local_id: newLocalId, email });
  }

  // --- LOGIN ---
  if (action === "login") {
    const { results } = await env.DB.prepare("SELECT * FROM usuarios WHERE email = ?").bind(email).all();
    if (!results.length) return Response.json({ error: "Email o contraseña incorrectos" }, { status: 401 });

    const user = results[0];
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.password_hash) return Response.json({ error: "Email o contraseña incorrectos" }, { status: 401 });

    const sessionToken = randomHex(32);
    const expires = sessionExpires();
    await env.DB.prepare("UPDATE usuarios SET session_token = ?, session_expires = ? WHERE id = ?")
      .bind(sessionToken, expires, user.id).run();

    // Obtener lista de locales del usuario
    const { results: userLocales } = await env.DB.prepare(
      "SELECT ul.local_id, ul.slug, l.nombre, l.ciudad FROM usuario_locales ul LEFT JOIN locales l ON l.id = ul.local_id WHERE ul.usuario_id = ? ORDER BY ul.created_at ASC"
    ).bind(user.id).all();

    const firstLocal = userLocales[0] || null;
    return Response.json({
      ok: true,
      token: sessionToken,
      email: user.email,
      locales: userLocales,
      // Compatibilidad: si hay exactamente 1 local, devolver local_id y slug directamente
      local_id: firstLocal?.local_id || null,
      slug: firstLocal?.slug || null,
    });
  }

  // --- ADD LOCAL (usuario ya autenticado añade otro local a su cuenta) ---
  if (action === "add_local") {
    // Verificar sesión activa
    const authHeader = request.headers.get("Authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!bearerToken) return Response.json({ error: "No autorizado" }, { status: 401 });
    const now = new Date().toISOString();
    const { results: users } = await env.DB.prepare(
      "SELECT id FROM usuarios WHERE session_token = ? AND session_expires > ?"
    ).bind(bearerToken, now).all();
    if (!users.length) return Response.json({ error: "No autorizado" }, { status: 401 });
    const userId = users[0].id;

    if (local_id) {
      // Local ya existe en DB
      const { results: locales } = await env.DB.prepare("SELECT id, nombre, ciudad FROM locales WHERE id = ?").bind(local_id).all();
      if (!locales.length) return Response.json({ error: "Local no encontrado" }, { status: 404 });
      const local = locales[0];

      // Verificar que no está ya reclamado
      const { results: existing } = await env.DB.prepare("SELECT id FROM usuario_locales WHERE local_id = ?").bind(local_id).all();
      if (existing.length) return Response.json({ error: "Este local ya tiene una cuenta registrada" }, { status: 409 });

      let slug = generateSlug(local.nombre, local.ciudad);
      const { results: slugExists } = await env.DB.prepare("SELECT id FROM usuario_locales WHERE slug = ?").bind(slug).all();
      if (slugExists.length) slug = `${slug}-${randomHex(3)}`;

      await env.DB.prepare(
        "INSERT INTO usuario_locales (usuario_id, local_id, slug, trial_inicio) VALUES (?, ?, ?, datetime('now'))"
      ).bind(userId, local_id, slug).run();
      await env.DB.prepare("UPDATE locales SET claimed = 1, slug = ? WHERE id = ?").bind(slug, local_id).run();

      return Response.json({ ok: true, local_id, slug });
    }

    // Local nuevo (no existe en DB)
    const { nombre, tipo, ciudad, direccion, telefono, web, instagram } = body;
    if (!nombre || !ciudad) return Response.json({ error: "Nombre y ciudad son obligatorios" }, { status: 400 });

    const newLocalId = `b2b_${randomHex(8)}`;
    let slug = generateSlug(nombre, ciudad);
    const { results: slugExists } = await env.DB.prepare("SELECT id FROM usuario_locales WHERE slug = ?").bind(slug).all();
    if (slugExists.length) slug = `${slug}-${randomHex(3)}`;

    await env.DB.prepare(
      "INSERT INTO locales (id, nombre, tipo, ciudad, direccion, telefono, web, instagram, fuente, claimed, slug, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'b2b', 1, ?, datetime('now'))"
    ).bind(newLocalId, nombre, tipo || "bar", ciudad, direccion || null, telefono || null, web || null, instagram || null, slug).run();

    await env.DB.prepare(
      "INSERT INTO usuario_locales (usuario_id, local_id, slug, trial_inicio) VALUES (?, ?, ?, datetime('now'))"
    ).bind(userId, newLocalId, slug).run();

    return Response.json({ ok: true, local_id: newLocalId, slug });
  }

  return Response.json({ error: "Acción no válida" }, { status: 400 });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Local-Id",
    },
  });
}
