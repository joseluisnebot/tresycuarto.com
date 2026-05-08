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
  return { id: user.id, ul_id: ul.id, email: user.email, local_id: ul.local_id, slug: ul.slug, plan: ul.plan || "trial" };
}

const COLORES_VALIDOS = ["naranja", "dorado", "verde", "azul", "morado", "rosa", "rojo", "oscuro"];
const TEMPLATES_VALIDOS = ["bold", "fresh", "elegante", "minimalista", "completo", "restaurante"];
const SECTIONS_VALIDAS = ["galeria", "eventos", "mapa"];

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { results } = await env.DB.prepare(
    "SELECT theme FROM usuario_locales WHERE id = ?"
  ).bind(user.ul_id).all();

  const raw = results[0]?.theme;
  let theme = { color: "naranja", template: "completo", sections: ["galeria", "eventos", "mapa"] };
  if (raw) { try { theme = { ...theme, ...JSON.parse(raw) }; } catch {} }

  return Response.json({ theme });
}

export async function onRequestPut(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }

  const color    = COLORES_VALIDOS.includes(body.color)     ? body.color    : "naranja";
  const template = TEMPLATES_VALIDOS.includes(body.template) ? body.template : "completo";
  const sections = Array.isArray(body.sections)
    ? body.sections.filter((s) => SECTIONS_VALIDAS.includes(s))
    : ["galeria", "eventos", "mapa"];

  const theme = JSON.stringify({ color, template, sections });
  await env.DB.prepare("UPDATE usuario_locales SET theme = ? WHERE id = ?").bind(theme, user.ul_id).run();

  return Response.json({ ok: true, theme: { color, template, sections } });
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
