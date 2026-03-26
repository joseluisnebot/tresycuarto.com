const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export async function onRequestGet({ request, env }) {
  const url   = new URL(request.url);
  const lat   = parseFloat(url.searchParams.get("lat"));
  const lon   = parseFloat(url.searchParams.get("lon"));
  const radio = parseFloat(url.searchParams.get("radio") || "1000"); // metros

  if (isNaN(lat) || isNaN(lon)) return Response.json({ error: "Coordenadas inválidas" }, { status: 400, headers: CORS });

  // Bounding box aproximado para filtrar en SQL (1° lat ≈ 111km, 1° lon ≈ 85km en España)
  const dLat = radio / 111000;
  const dLon = radio / 85000;

  const { results } = await env.DB.prepare(
    `SELECT id, nombre, tipo, ciudad, slug, direccion, horario_google, horario,
            terraza, outdoor_seating, live_music, good_for_groups, allows_dogs,
            lat, lon, photo_url, rating, rating_count, price_level,
            -- Distancia aproximada en metros (Haversine simplificado)
            ROUND(111000 * SQRT(POW(lat - ?, 2) + POW((lon - ?) * 0.77, 2))) as distancia
     FROM locales
     WHERE lat BETWEEN ? AND ?
       AND lon BETWEEN ? AND ?
       AND lat IS NOT NULL
     ORDER BY distancia ASC
     LIMIT 30`
  ).bind(lat, lon, lat - dLat, lat + dLat, lon - dLon, lon + dLon).all();

  // Filtrar por radio exacto
  const locales = results.filter(l => l.distancia <= radio);

  return Response.json({ locales, lat, lon, radio }, { headers: CORS });
}
