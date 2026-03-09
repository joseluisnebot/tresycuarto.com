export async function onRequestGet(context) {
  const { env, request } = context;
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "Falta slug" }, { status: 400 });

  const { results: authRows } = await env.DB.prepare(
    "SELECT local_id, slug, plan FROM locales_auth WHERE slug = ?"
  ).bind(slug).all();

  if (!authRows.length) return Response.json({ error: "No encontrado" }, { status: 404 });
  const auth = authRows[0];

  const { results } = await env.DB.prepare(
    "SELECT nombre, tipo, ciudad, direccion, telefono, web, instagram, horario, terraza, musica, descripcion, foto_perfil FROM locales WHERE id = ?"
  ).bind(auth.local_id).all();

  if (!results.length) return Response.json({ error: "No encontrado" }, { status: 404 });

  return Response.json(
    { ...results[0], slug: auth.slug, plan: auth.plan },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" } }
  );
}
