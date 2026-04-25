const ZONE_ID = "5cde45781dcb65b4336b5c8626603520";

export async function onRequestGet(context) {
  const { env, request } = context;

  const token = new URL(request.url).searchParams.get("token");
  if (!token || token !== env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { results: localStats },
    { results: solicitudes },
    { results: calidadRows },
    { results: geocoderRows },
    { results: b2bRows },
    { results: b2bListaRows },
    { results: eventosPendientes },
    { results: emailsPersonales },
  ] = await Promise.all([
    env.DB.prepare("SELECT ciudad, COUNT(*) as total FROM locales GROUP BY ciudad ORDER BY total DESC").all(),
    env.DB.prepare("SELECT * FROM solicitudes ORDER BY creado_en DESC LIMIT 50").all(),
    env.DB.prepare(`
      SELECT ciudad,
        COUNT(*) as total,
        SUM(CASE WHEN direccion IS NOT NULL AND direccion != '' THEN 1 ELSE 0 END) as con_dir,
        SUM(CASE WHEN instagram IS NOT NULL AND instagram != '' THEN 1 ELSE 0 END) as con_ig,
        SUM(CASE WHEN web IS NOT NULL AND web != '' THEN 1 ELSE 0 END) as con_web,
        SUM(CASE WHEN telefono IS NOT NULL AND telefono != '' THEN 1 ELSE 0 END) as con_tel
      FROM locales GROUP BY ciudad ORDER BY ciudad
    `).all(),
    env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN direccion IS NOT NULL AND direccion != '' THEN 1 ELSE 0 END) as con_dir,
        SUM(CASE WHEN direccion IS NULL OR direccion = '' THEN 1 ELSE 0 END) as pendientes
      FROM locales
    `).all(),
    env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN u.verified = 1 THEN 1 ELSE 0 END) as verificados,
        SUM(CASE WHEN u.created_at >= ? THEN 1 ELSE 0 END) as esta_semana
      FROM usuarios u
    `).bind(hace7dias).all(),
    env.DB.prepare(`
      SELECT u.email, ul.slug, ul.plan, u.verified, u.created_at,
             l.nombre, l.ciudad, l.tipo
      FROM usuarios u
      JOIN usuario_locales ul ON ul.usuario_id = u.id
      LEFT JOIN locales l ON l.id = ul.local_id
      ORDER BY u.created_at DESC LIMIT 20
    `).all(),
    env.DB.prepare(`
      SELECT id, nombre, ciudad, fecha, hora_inicio, direccion, tipo, descripcion, radio_m, dias_previos_envio, estado
      FROM eventos_geo
      WHERE estado IN ('pendiente', 'revision_enviada')
      ORDER BY fecha ASC
    `).all(),
    env.DB.prepare(`
      SELECT id, nombre, ciudad, tipo, email_personal, web, instagram, slug, rating
      FROM locales
      WHERE email_personal IS NOT NULL AND email_personal != ''
        AND claimed = 0
        AND (email_outreach_sent IS NULL OR email_outreach_sent = 0)
      ORDER BY rating DESC NULLS LAST
      LIMIT 50
    `).all(),
  ]);

  const totalLocales = localStats.reduce((s, r) => s + r.total, 0);
  const geocoder = geocoderRows[0] || { total: 0, con_dir: 0, pendientes: 0 };
  const b2b = b2bRows[0] || { total: 0, verificados: 0, esta_semana: 0 };

  // Suscriptores desde Listmonk
  let suscriptores = 0;
  let listaSuscriptores = [];
  let suscriptoresEstaSemana = 0;
  try {
    const auth = btoa(`${env.LISTMONK_API_USER}:${env.LISTMONK_API_PASS}`);
    const lmHeaders = { Authorization: `Basic ${auth}` };
    if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
      lmHeaders["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
      lmHeaders["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
    }
    const lmRes = await fetch("https://listmonk.tresycuarto.com/api/subscribers?page=1&per_page=100&order_by=created_at&order=DESC", {
      headers: lmHeaders,
    });
    const lmData = await lmRes.json();
    suscriptores = lmData.data?.total || 0;
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    listaSuscriptores = (lmData.data?.results || []).map(s => ({
      email: s.email,
      ciudad: s.attribs?.ciudades?.join(", ") || s.attribs?.ciudad || "",
      fecha: s.created_at?.slice(0, 10) || "",
      status: s.status,
    }));
    suscriptoresEstaSemana = listaSuscriptores.filter(s => s.fecha >= hace7dias).length;
  } catch {}

  // Analytics Cloudflare
  let visitas = [];
  let visitasEspana = [];
  let visitantesEspanaSemana = 0;
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const gqlRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.CF_ANALYTICS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ viewer { zones(filter: { zoneTag: "${ZONE_ID}" }) {
          total: httpRequests1dGroups(limit: 7, orderBy: [date_ASC], filter: { date_gt: "${since}" }) {
            dimensions { date }
            sum { pageViews }
            uniq { uniques }
          }
          espana: httpRequests1dGroups(limit: 7, orderBy: [date_ASC], filter: { date_gt: "${since}", clientCountryName: "ES" }) {
            dimensions { date }
            sum { pageViews }
            uniq { uniques }
          }
        } } }`
      }),
    });
    const gqlData = await gqlRes.json();
    const zone = gqlData.data?.viewer?.zones?.[0];
    visitas = zone?.total || [];
    visitasEspana = zone?.espana || [];
    visitantesEspanaSemana = visitasEspana.reduce((s, v) => s + v.uniq.uniques, 0);
  } catch {}

  const conversion = visitantesEspanaSemana > 0
    ? ((suscriptoresEstaSemana / visitantesEspanaSemana) * 100).toFixed(1)
    : null;

  return Response.json({
    suscriptores,
    listaSuscriptores,
    suscriptoresEstaSemana,
    totalLocales,
    totalSolicitudes: solicitudes.length,
    localStats,
    solicitudes,
    visitas,
    visitasEspana,
    visitantesEspanaSemana,
    conversion,
    calidad: calidadRows,
    geocoder,
    b2b,
    b2bLista: b2bListaRows,
    eventosPendientes,
    emailsPersonales,
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
