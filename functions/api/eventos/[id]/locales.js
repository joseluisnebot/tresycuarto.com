/**
 * GET /api/eventos/:id/locales
 * Devuelve los locales del matching geoespacial para un evento concreto.
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  if (!id) {
    return Response.json({ error: "id requerido" }, { status: 400 });
  }

  // Info del evento
  const evento = await env.DB.prepare(
    "SELECT id, nombre, ciudad, radio_m, direccion, lat, lon FROM eventos_geo WHERE id = ? AND activo = 1"
  ).bind(id).first();

  if (!evento) {
    return Response.json({ error: "evento no encontrado" }, { status: 404 });
  }

  // Locales del matching
  const { results: locales } = await env.DB.prepare(`
    SELECT l.id, l.nombre, l.tipo, l.direccion, l.horario, l.terraza, l.web, l.instagram, el.distancia_m
    FROM eventos_geo_locales el
    JOIN locales l ON l.id = el.local_id
    WHERE el.evento_id = ?
    ORDER BY el.distancia_m ASC
  `).bind(id).all();

  return Response.json({ evento, locales }, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
