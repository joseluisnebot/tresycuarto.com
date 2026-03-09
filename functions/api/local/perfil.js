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
    verified: user.verified,
    local_id: ul.local_id,
    slug: ul.slug,
    plan: ul.plan || "trial",
    trial_inicio: ul.trial_inicio,
    plan_expires: ul.plan_expires,
    stripe_customer_id: ul.stripe_customer_id,
  };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { results } = await env.DB.prepare(
    "SELECT id, nombre, tipo, ciudad, lat, lon, direccion, codigo_postal, telefono, web, instagram, horario, terraza, musica, descripcion, foto_perfil, fotos, menu_url, slug, redes FROM locales WHERE id = ?"
  ).bind(user.local_id).all();

  // Lista de todos los locales del usuario (para selector en dashboard)
  const { results: userLocales } = await env.DB.prepare(
    "SELECT ul.local_id, ul.slug, l.nombre, l.ciudad FROM usuario_locales ul LEFT JOIN locales l ON l.id = ul.local_id WHERE ul.usuario_id = ? ORDER BY ul.created_at ASC"
  ).bind(user.id).all();

  const local = results[0] || null;
  return Response.json({ local, plan: user.plan, trial_inicio: user.trial_inicio, plan_expires: user.plan_expires || null, slug: user.slug, verified: user.verified === 1, locales: userLocales });
}

export async function onRequestPut(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }

  const ALLOWED = ["nombre", "descripcion", "telefono", "web", "instagram", "horario", "terraza", "redes"];
  const updates = [];
  const values = [];

  for (const field of ALLOWED) {
    if (field in body) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (!updates.length) return Response.json({ error: "Nada que actualizar" }, { status: 400 });

  values.push(user.local_id);
  await env.DB.prepare(`UPDATE locales SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();

  // Si cambia el slug
  if (body.slug && body.slug !== user.slug) {
    const newSlug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
    const { results: slugCheck } = await env.DB.prepare("SELECT id FROM usuario_locales WHERE slug = ? AND id != ?").bind(newSlug, user.ul_id).all();
    if (slugCheck.length) return Response.json({ error: "Ese slug ya está en uso" }, { status: 409 });
    await env.DB.prepare("UPDATE usuario_locales SET slug = ? WHERE id = ?").bind(newSlug, user.ul_id).run();
    await env.DB.prepare("UPDATE locales SET slug = ? WHERE id = ?").bind(newSlug, user.local_id).run();
  }

  return Response.json({ ok: true });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Local-Id",
    },
  });
}
