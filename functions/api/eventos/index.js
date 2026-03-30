/**
 * GET /api/eventos?ciudad=X&limit=10
 * Devuelve eventos aprobados futuros (proximos) y pasados recientes (historial, últimos 60 días).
 */
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const ciudad = url.searchParams.get("ciudad") || "";
  const limit  = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

  const hoy    = new Date().toISOString().slice(0, 10);
  const hace60 = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const FIELDS = `id, nombre, tipo, ciudad, fecha, hora_inicio, direccion, descripcion, radio_m, dias_previos_envio`;

  let qFuturos, qPasados, pFuturos, pPasados;

  if (ciudad) {
    qFuturos = `SELECT ${FIELDS} FROM eventos_geo WHERE estado='aprobado' AND activo=1 AND fecha >= ? AND ciudad=? ORDER BY fecha ASC LIMIT ?`;
    pFuturos = [hoy, ciudad, limit];
    qPasados = `SELECT ${FIELDS} FROM eventos_geo WHERE estado='aprobado' AND activo=1 AND fecha >= ? AND fecha < ? AND ciudad=? ORDER BY fecha DESC LIMIT 10`;
    pPasados = [hace60, hoy, ciudad];
  } else {
    qFuturos = `SELECT ${FIELDS} FROM eventos_geo WHERE estado='aprobado' AND activo=1 AND fecha >= ? ORDER BY fecha ASC LIMIT ?`;
    pFuturos = [hoy, limit];
    qPasados = `SELECT ${FIELDS} FROM eventos_geo WHERE estado='aprobado' AND activo=1 AND fecha >= ? AND fecha < ? ORDER BY fecha DESC LIMIT 20`;
    pPasados = [hace60, hoy];
  }

  const [{ results: eventos }, { results: pasados }] = await Promise.all([
    env.DB.prepare(qFuturos).bind(...pFuturos).all(),
    env.DB.prepare(qPasados).bind(...pPasados).all(),
  ]);

  return Response.json({ eventos, pasados }, {
    headers: { "Cache-Control": "public, max-age=3600" }
  });
}
