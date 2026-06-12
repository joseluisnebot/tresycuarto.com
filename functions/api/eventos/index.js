/**
 * GET /api/eventos?ciudad=X&q=texto&limit=10
 * Devuelve:
 *  - eventos: aprobados futuros (próximos), con filtro opcional por ciudad y/o búsqueda de texto
 *  - pasados: aprobados recientes (historial, últimos 60 días)
 *  - ciudades: lista de ciudades con eventos futuros (con conteo) para construir los filtros
 */
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const ciudad = (url.searchParams.get("ciudad") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

  const hoy = new Date().toISOString().slice(0, 10);
  const hace60 = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const FIELDS = `id, nombre, tipo, ciudad, fecha, hora_inicio, direccion, descripcion, radio_m, dias_previos_envio`;

  const whereFut = ["estado='aprobado'", "activo=1", "fecha >= ?"];
  const pFut = [hoy];
  if (ciudad) { whereFut.push("ciudad = ?"); pFut.push(ciudad); }
  if (q) { whereFut.push("(nombre LIKE ? OR ciudad LIKE ?)"); pFut.push(`%${q}%`, `%${q}%`); }

  const wherePas = ["estado='aprobado'", "activo=1", "fecha >= ?", "fecha < ?"];
  const pPas = [hace60, hoy];
  if (ciudad) { wherePas.push("ciudad = ?"); pPas.push(ciudad); }
  if (q) { wherePas.push("(nombre LIKE ? OR ciudad LIKE ?)"); pPas.push(`%${q}%`, `%${q}%`); }

  const [{ results: eventos }, { results: pasados }, { results: ciudades }] = await Promise.all([
    env.DB.prepare(`SELECT ${FIELDS} FROM eventos_geo WHERE ${whereFut.join(" AND ")} ORDER BY fecha ASC LIMIT ?`).bind(...pFut, limit).all(),
    env.DB.prepare(`SELECT ${FIELDS} FROM eventos_geo WHERE ${wherePas.join(" AND ")} ORDER BY fecha DESC LIMIT 20`).bind(...pPas).all(),
    env.DB.prepare("SELECT ciudad, COUNT(*) AS n FROM eventos_geo WHERE estado='aprobado' AND activo=1 AND fecha >= ? GROUP BY ciudad ORDER BY n DESC").bind(hoy).all(),
  ]);

  return Response.json({ eventos, pasados, ciudades }, {
    headers: { "Cache-Control": "public, max-age=3600" }
  });
}
