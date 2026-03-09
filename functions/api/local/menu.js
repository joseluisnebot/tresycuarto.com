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

// POST — subir carta (PDF o imagen)
export async function onRequestPost(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!isPlanActive(user)) return Response.json({ error: "La carta requiere el plan Pro" }, { status: 403 });

  let formData;
  try { formData = await request.formData(); } catch { return Response.json({ error: "Formato inválido" }, { status: 400 }); }

  const file = formData.get("file");
  if (!file || typeof file === "string") return Response.json({ error: "Falta el archivo" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Máximo 10MB" }, { status: 400 });

  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return Response.json({ error: "Solo se aceptan PDF, JPG, PNG o WebP" }, { status: 400 });
  }

  const ext = file.type === "application/pdf" ? "pdf"
    : file.type === "image/png" ? "png"
    : file.type === "image/webp" ? "webp"
    : "jpg";

  const folder = user.slug || user.local_id;
  const key = `${folder}/menu.${ext}`;

  // Borrar carta anterior si existía con distinta extensión
  for (const e of ["pdf", "jpg", "png", "webp"]) {
    if (e !== ext) {
      try { await env.MEDIA.delete(`${folder}/menu.${e}`); } catch { /* ok */ }
      if (folder !== user.local_id) {
        try { await env.MEDIA.delete(`${user.local_id}/menu.${e}`); } catch { /* ok */ }
      }
    }
  }

  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000" },
  });

  const url = `https://media.tresycuarto.com/${key}`;
  await env.DB.prepare("UPDATE locales SET menu_url = ? WHERE id = ?").bind(url, user.local_id).run();

  return Response.json({ ok: true, url });
}

// DELETE — eliminar carta
export async function onRequestDelete(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { results } = await env.DB.prepare("SELECT menu_url FROM locales WHERE id = ?").bind(user.local_id).all();
  const menuUrl = results[0]?.menu_url;

  if (menuUrl) {
    const key = menuUrl.replace("https://media.tresycuarto.com/", "");
    try { await env.MEDIA.delete(key); } catch { /* ok */ }
    await env.DB.prepare("UPDATE locales SET menu_url = NULL WHERE id = ?").bind(user.local_id).run();
  }

  return Response.json({ ok: true });
}
