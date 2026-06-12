export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const ciudad = url.searchParams.get("ciudad");
  const tipo = url.searchParams.get("tipo");
  const terraza = url.searchParams.get("terraza");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  if (!ciudad) {
    return Response.json({ error: "Parámetro 'ciudad' requerido" }, { status: 400 });
  }

  let sql = "SELECT id, nombre, tipo, ciudad, lat, lon, direccion, codigo_postal, telefono, web, instagram, horario, terraza, musica, fuente, creado_en, descripcion, foto_perfil, fotos, claimed, slug, menu_url, redes, rating, rating_count, google_place_id, photo_url, price_level, horario_google, descripcion_google, live_music, outdoor_seating, good_for_groups, allows_dogs, photo_source FROM locales WHERE ciudad = ?";
  const params = [ciudad];

  if (tipo) { sql += " AND tipo = ?"; params.push(tipo); }
  if (terraza === "1") { sql += " AND terraza = 1"; }

  sql += " ORDER BY claimed DESC, nombre COLLATE NOCASE LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const { results } = await env.DB.prepare(sql).bind(...params).all();

  const countSql = "SELECT COUNT(*) as total FROM locales WHERE ciudad = ?" +
    (tipo ? " AND tipo = ?" : "") +
    (terraza === "1" ? " AND terraza = 1" : "");
  const countParams = tipo ? [ciudad, tipo] : [ciudad];
  const { results: countRes } = await env.DB.prepare(countSql).bind(...countParams).all();

  return Response.json({
    total: countRes[0].total,
    limit,
    offset,
    locales: results,
  }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" }
  });
}
