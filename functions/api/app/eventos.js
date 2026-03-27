import CITIES from "../../../data/cities.json";

const SLUG_TO_CIUDAD = Object.fromEntries(CITIES.map(c => [c.slug, c.name]));
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export async function onRequestGet({ request, env }) {
  const url  = new URL(request.url);
  const hoy  = new Date().toISOString().split("T")[0];

  // Acepta ?ciudad=slug (una ciudad) o ?ciudades=Madrid,Vinaròs (varias, por nombre)
  const slug     = url.searchParams.get("ciudad");
  const ciudades = url.searchParams.get("ciudades"); // nombres separados por coma

  let where  = "";
  let params = [hoy];

  if (ciudades) {
    const lista = ciudades.split(",").map(c => c.trim()).filter(Boolean);
    if (lista.length === 1) {
      where  = "AND ciudad=?";
      params = [hoy, lista[0]];
    } else if (lista.length > 1) {
      const placeholders = lista.map(() => "?").join(",");
      where  = `AND ciudad IN (${placeholders})`;
      params = [hoy, ...lista];
    }
  } else if (slug) {
    const ciudad = SLUG_TO_CIUDAD[slug];
    if (ciudad) {
      where  = "AND ciudad=?";
      params = [hoy, ciudad];
    }
  }

  const { results: eventos } = await env.DB.prepare(
    `SELECT id, nombre, tipo, ciudad, fecha, hora_inicio, direccion, descripcion, lat, lon
     FROM eventos_geo WHERE estado='aprobado' AND fecha >= ? ${where}
     ORDER BY fecha ASC, hora_inicio ASC LIMIT 100`
  ).bind(...params).all();

  return Response.json({ eventos }, { headers: CORS });
}
