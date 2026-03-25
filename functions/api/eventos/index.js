/**
 * GET /api/eventos?ciudad=X&limit=10
 * Devuelve eventos aprobados futuros, ordenados por fecha ASC.
 */
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const ciudad = url.searchParams.get("ciudad") || "";
  const limit  = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

  const hoy = new Date().toISOString().slice(0, 10);

  let query, params;
  if (ciudad) {
    query = `SELECT id, nombre, tipo, ciudad, fecha, hora_inicio, direccion, descripcion, radio_m, dias_previos_envio
             FROM eventos_geo
             WHERE estado = 'aprobado' AND activo = 1 AND fecha >= ? AND ciudad = ?
             ORDER BY fecha ASC LIMIT ?`;
    params = [hoy, ciudad, limit];
  } else {
    query = `SELECT id, nombre, tipo, ciudad, fecha, hora_inicio, direccion, descripcion, radio_m, dias_previos_envio
             FROM eventos_geo
             WHERE estado = 'aprobado' AND activo = 1 AND fecha >= ?
             ORDER BY fecha ASC LIMIT ?`;
    params = [hoy, limit];
  }

  const { results } = await env.DB.prepare(query).bind(...params).all();

  return Response.json({ eventos: results }, {
    headers: { "Cache-Control": "public, max-age=3600" }
  });
}
