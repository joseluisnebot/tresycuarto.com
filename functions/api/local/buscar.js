export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const ciudad = url.searchParams.get("ciudad")?.trim() || "";

  if (q.length < 2) return Response.json({ results: [] });

  const like = `%${q}%`;
  let stmt;
  if (ciudad) {
    stmt = env.DB.prepare(
      "SELECT id, nombre, tipo, ciudad, direccion, claimed FROM locales WHERE nombre LIKE ? AND ciudad = ? ORDER BY nombre LIMIT 15"
    ).bind(like, ciudad);
  } else {
    stmt = env.DB.prepare(
      "SELECT id, nombre, tipo, ciudad, direccion, claimed FROM locales WHERE nombre LIKE ? ORDER BY nombre LIMIT 15"
    ).bind(like);
  }

  const { results } = await stmt.all();
  return Response.json({ results }, { headers: { "Access-Control-Allow-Origin": "*" } });
}
