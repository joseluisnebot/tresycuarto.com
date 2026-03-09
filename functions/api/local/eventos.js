async function getAuthUser(env, request) {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  const now = new Date().toISOString();

  const { results: users } = await env.DB.prepare(
    "SELECT * FROM usuarios WHERE session_token = ? AND session_expires > ?"
  ).bind(token, now).all();
  if (!users.length) return null;
  const user = users[0];

  const localId = request.headers.get("X-Local-Id");
  const { results: uls } = localId
    ? await env.DB.prepare("SELECT * FROM usuario_locales WHERE usuario_id = ? AND local_id = ?").bind(user.id, localId).all()
    : await env.DB.prepare("SELECT * FROM usuario_locales WHERE usuario_id = ? LIMIT 1").bind(user.id).all();
  if (!uls.length) return null;
  const ul = uls[0];

  return {
    id: user.id, ul_id: ul.id,
    local_id: ul.local_id, slug: ul.slug,
    plan: ul.plan || "trial", trial_inicio: ul.trial_inicio, plan_expires: ul.plan_expires,
  };
}

function isPlanActive(user) {
  if (user.plan === "pro") {
    if (!user.plan_expires) return true;
    return new Date(user.plan_expires) > new Date();
  }
  if (!user.trial_inicio) return false;
  const trialEnd = new Date(new Date(user.trial_inicio).getTime() + 14 * 24 * 60 * 60 * 1000);
  return trialEnd > new Date();
}

// GET — lista eventos del local
export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { results } = await env.DB.prepare(
    "SELECT * FROM eventos WHERE local_id = ? ORDER BY fecha ASC, hora_inicio ASC"
  ).bind(user.local_id).all();

  return Response.json({ eventos: results });
}

// POST — crear evento
export async function onRequestPost(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!isPlanActive(user)) return Response.json({ error: "Los eventos requieren el plan Pro" }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }

  const { titulo, descripcion, fecha, hora_inicio, hora_fin, precio, enlace } = body;
  if (!titulo || !fecha) return Response.json({ error: "Título y fecha son obligatorios" }, { status: 400 });

  const { meta } = await env.DB.prepare(
    "INSERT INTO eventos (local_id, titulo, descripcion, fecha, hora_inicio, hora_fin, precio, enlace) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(user.local_id, titulo, descripcion || null, fecha, hora_inicio || null, hora_fin || null, precio || null, enlace || null).run();

  return Response.json({ ok: true, id: meta.last_row_id });
}

// PUT — editar evento
export async function onRequestPut(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }

  const { id, titulo, descripcion, fecha, hora_inicio, hora_fin, precio, enlace } = body;
  if (!id || !titulo || !fecha) return Response.json({ error: "id, título y fecha son obligatorios" }, { status: 400 });

  // Verificar que pertenece a este local
  const { results } = await env.DB.prepare("SELECT id FROM eventos WHERE id = ? AND local_id = ?").bind(id, user.local_id).all();
  if (!results.length) return Response.json({ error: "No encontrado" }, { status: 404 });

  await env.DB.prepare(
    "UPDATE eventos SET titulo=?, descripcion=?, fecha=?, hora_inicio=?, hora_fin=?, precio=?, enlace=? WHERE id=?"
  ).bind(titulo, descripcion || null, fecha, hora_inicio || null, hora_fin || null, precio || null, enlace || null, id).run();

  return Response.json({ ok: true });
}

// DELETE — eliminar evento (?id=...)
export async function onRequestDelete(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Falta id" }, { status: 400 });

  // Verificar que el evento pertenece a este local
  const { results } = await env.DB.prepare("SELECT id FROM eventos WHERE id = ? AND local_id = ?").bind(id, user.local_id).all();
  if (!results.length) return Response.json({ error: "No encontrado" }, { status: 404 });

  await env.DB.prepare("DELETE FROM eventos WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
