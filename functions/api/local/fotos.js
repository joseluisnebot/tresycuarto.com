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
    id: user.id, ul_id: ul.id, email: user.email,
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

// GET — lista de fotos del local
export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { results } = await env.DB.prepare("SELECT foto_perfil, fotos FROM locales WHERE id = ?").bind(user.local_id).all();
  const local = results[0] || {};
  const fotos = local.fotos ? JSON.parse(local.fotos) : [];
  return Response.json({ foto_perfil: local.foto_perfil || null, fotos });
}

// POST — subir foto (multipart/form-data con campo "file" y "tipo": "perfil"|"galeria")
export async function onRequestPost(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  let formData;
  try { formData = await request.formData(); } catch { return Response.json({ error: "Formato inválido" }, { status: 400 }); }

  const file = formData.get("file");
  const tipo = formData.get("tipo") || "galeria"; // "perfil" | "galeria"

  if (!file || typeof file === "string") return Response.json({ error: "Falta el archivo" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Máximo 5MB por foto" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return Response.json({ error: "Solo se aceptan JPG, PNG o WebP" }, { status: 400 });
  }

  // Plan check para galería (perfil de foto siempre libre)
  if (tipo === "galeria" && !isPlanActive(user)) {
    return Response.json({ error: "La galería requiere el plan Pro" }, { status: 403 });
  }

  // Limitar galería a 6 fotos
  if (tipo === "galeria") {
    const { results } = await env.DB.prepare("SELECT fotos FROM locales WHERE id = ?").bind(user.local_id).all();
    const fotosActuales = results[0]?.fotos ? JSON.parse(results[0].fotos) : [];
    if (fotosActuales.length >= 6) return Response.json({ error: "Máximo 6 fotos en la galería" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const folder = user.slug || user.local_id;
  const key = `${folder}/${tipo === "perfil" ? "perfil" : `galeria_${Date.now()}`}.${ext}`;

  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000" },
  });

  const url = `https://media.tresycuarto.com/${key}`;

  if (tipo === "perfil") {
    await env.DB.prepare("UPDATE locales SET foto_perfil = ? WHERE id = ?").bind(url, user.local_id).run();
  } else {
    const { results } = await env.DB.prepare("SELECT fotos FROM locales WHERE id = ?").bind(user.local_id).all();
    const fotos = results[0]?.fotos ? JSON.parse(results[0].fotos) : [];
    fotos.push(url);
    await env.DB.prepare("UPDATE locales SET fotos = ? WHERE id = ?").bind(JSON.stringify(fotos), user.local_id).run();
  }

  return Response.json({ ok: true, url });
}

// DELETE — eliminar foto (?url=...)
export async function onRequestDelete(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(request.url).searchParams.get("url");
  if (!url) return Response.json({ error: "Falta url" }, { status: 400 });

  // Verificar que la foto pertenece a este local
  const validFolders = [user.local_id, user.slug].filter(Boolean);
  if (!validFolders.some(f => url.includes(`/${f}/`))) return Response.json({ error: "No autorizado" }, { status: 403 });

  const key = url.replace("https://media.tresycuarto.com/", "");
  try { await env.MEDIA.delete(key); } catch { /* no existe, ok */ }

  const { results } = await env.DB.prepare("SELECT foto_perfil, fotos FROM locales WHERE id = ?").bind(user.local_id).all();
  const local = results[0] || {};

  if (local.foto_perfil === url) {
    await env.DB.prepare("UPDATE locales SET foto_perfil = NULL WHERE id = ?").bind(user.local_id).run();
  } else {
    const fotos = local.fotos ? JSON.parse(local.fotos).filter((f) => f !== url) : [];
    await env.DB.prepare("UPDATE locales SET fotos = ? WHERE id = ?").bind(JSON.stringify(fotos), user.local_id).run();
  }

  return Response.json({ ok: true });
}
