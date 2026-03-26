/**
 * GET /api/aprobar-evento?id=X&token=Y&accion=aprobar|rechazar
 *
 * Aprueba o rechaza el envío de una newsletter de evento.
 * - Si aprueba: marca el evento como 'aprobado' y dispara el envío a suscriptores via listmonk
 * - Si rechaza: marca el evento como 'rechazado'
 * Devuelve página HTML de confirmación.
 */

const LISTMONK_URL     = "https://listmonk.tresycuarto.com";
const LISTMONK_LIST_ID = 3;

function page(title, icon, message, color, detail = "") {
  return new Response(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · tresycuarto</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1C1917; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
    .card { background: #292524; border-radius: 20px; padding: 3rem; max-width: 480px; width: 100%;
            text-align: center; border: 1px solid #3C3836; }
    .icon { font-size: 4rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 800; color: #FFF8EF; margin-bottom: 0.75rem; }
    p { font-size: 0.95rem; color: #A8A29E; line-height: 1.6; }
    .badge { display: inline-block; background: ${color}22; color: ${color}; border: 1px solid ${color};
             border-radius: 20px; padding: 0.4rem 1rem; font-size: 0.8rem; font-weight: 700;
             margin-top: 1.5rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .detail { margin-top: 1rem; font-size: 0.8rem; color: #57534E; }
    a { color: #FB923C; text-decoration: none; }
    .logo { font-size: 1.1rem; font-weight: 800; color: #FB923C; letter-spacing: -0.03em;
            margin-bottom: 2rem; display: block; }
  </style>
</head>
<body>
  <div class="card">
    <a href="https://tresycuarto.com" class="logo">tresycuarto</a>
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${detail ? `<p class="detail">${detail}</p>` : ""}
    <span class="badge">${title}</span>
  </div>
</body>
</html>`, {
    headers: { "Content-Type": "text/html;charset=UTF-8" }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id     = url.searchParams.get("id");
  const token  = url.searchParams.get("token");
  const accion = url.searchParams.get("accion");

  if (!id || !token || !["aprobar", "rechazar"].includes(accion)) {
    return page("Enlace inválido", "❌", "Este enlace no es válido o está incompleto.", "#EF4444");
  }

  // Verificar el evento y el token en D1
  const db = env.DB;
  const row = await db.prepare(
    "SELECT * FROM eventos_geo WHERE id = ? AND token_aprobacion = ? AND activo = 1"
  ).bind(id, token).first();

  if (!row) {
    return page("Enlace caducado", "⏰",
      "Este enlace ya no es válido. Puede que el evento haya sido aprobado o rechazado anteriormente.",
      "#F59E0B");
  }

  if (row.estado === "enviado") {
    return page("Ya enviada", "✅",
      `La newsletter de <strong>${row.nombre}</strong> ya fue enviada a los suscriptores.`,
      "#22C55E", `Evento: ${row.nombre} · ${row.ciudad}`);
  }

  if (row.estado === "aprobado" && accion === "aprobar") {
    // Calcular fecha de envío
    const fechaEvento = new Date(row.fecha + "T12:00:00");
    const diasPrevios = row.dias_previos_envio || 2;
    const fechaEnvio = new Date(fechaEvento);
    fechaEnvio.setDate(fechaEnvio.getDate() - diasPrevios);
    const fechaEnvioEs = fechaEnvio.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    return page("Ya aprobada", "✅",
      `Esta newsletter ya estaba aprobada. Se enviará automáticamente el <strong>${fechaEnvioEs}</strong>.`,
      "#22C55E");
  }

  if (accion === "rechazar") {
    await db.prepare("UPDATE eventos_geo SET estado = 'rechazado', token_aprobacion = NULL WHERE id = ?")
      .bind(id).run();
    return page("Newsletter rechazada", "🚫",
      `La newsletter de <strong>${row.nombre}</strong> ha sido rechazada y no se enviará.`,
      "#EF4444",
      `Para regenerarla, edita el evento y ejecuta <code>preview_newsletter.py --forzar --evento ${id}</code>`);
  }

  // APROBAR — programar el envío (no enviar ahora)
  await db.prepare("UPDATE eventos_geo SET estado = 'aprobado', token_aprobacion = NULL WHERE id = ?")
    .bind(id).run();

  // Calcular la fecha de envío programada
  const fechaEvento = new Date(row.fecha + "T12:00:00");
  const diasPrevios = row.dias_previos_envio || 2;
  const fechaEnvio = new Date(fechaEvento);
  fechaEnvio.setDate(fechaEnvio.getDate() - diasPrevios);
  const fechaEnvioEs = fechaEnvio.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  const fechaEventoEs = fechaEvento.toLocaleDateString("es-ES", { day: "numeric", month: "long" });

  return page("Newsletter aprobada ✓", "📅",
    `La newsletter de <strong>${row.nombre}</strong> se enviará automáticamente a los suscriptores el <strong>${fechaEnvioEs}</strong>, ${diasPrevios} días antes del evento (${fechaEventoEs}).`,
    "#22C55E",
    `El agente IA se encarga del envío. No necesitas hacer nada más.`);
}


function buildSubject(evento) {
  const fecha = new Date(evento.fecha + "T12:00:00");
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const icon = evento.tipo === "procesion" ? "⛪" : evento.tipo === "futbol" ? "⚽" : "🎵";
  return `${icon} ${evento.nombre} — ${fecha.getDate()} de ${meses[fecha.getMonth()]} · ${evento.ciudad}`;
}


function buildNewsletterHtml(evento, locales) {
  const fecha = new Date(evento.fecha + "T12:00:00");
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const fechaEs = `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  const icon = evento.tipo === "procesion" ? "⛪" : evento.tipo === "futbol" ? "⚽" : "🎵";
  const ciudadSlug = evento.ciudad.toLowerCase()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i").replace(/ó/g,"o").replace(/ú/g,"u")
    .replace(/ü/g,"u").replace(/ñ/g,"n")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

  const sinUbicacion = locales.some(l => (l.distancia_m ?? -1) < 0);
  const tarjetas = locales.map((l, i) => {
    const colorBadge = i === 0 ? "#FB923C" : l.terraza ? "#F59E0B" : "#78716C";
    const border = i === 0 ? "2px solid #FB923C" : "1px solid #E7E5E4";
    const extras = l.terraza ? " &middot; ☀️ Terraza" : "";
    const distLabel = (l.distancia_m ?? -1) >= 0 ? `${l.distancia_m}m` : "en la ciudad";
    const webHtml = l.web ? ` &nbsp;<a href="${l.web}" style="color:#FB923C;font-weight:600;">${l.web.slice(0,35)}</a>` : "";
    return `<tr><td style="background:#ffffff;padding:4px 40px;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:${border};border-radius:12px;margin-bottom:10px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${colorBadge};text-transform:uppercase;">#${i+1} &middot; ${distLabel}${extras}</p>
<p style="margin:0 0 4px;font-size:17px;font-weight:800;color:#1C1917;">${l.nombre}</p>
<p style="margin:0;font-size:12px;color:#A8A29E;">${l.direccion ? `&#128205; ${l.direccion}` : ""}${webHtml}</p>
</td></tr></table>
</td></tr>`;
  }).join("");

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;font-family:'Helvetica Neue',Arial,sans-serif;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#1C1917;border-radius:16px 16px 0 0;padding:28px 40px 24px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><span style="font-size:22px;font-weight:800;color:#FB923C;letter-spacing:-0.03em;">tresycuarto</span></td>
<td align="right"><span style="font-size:11px;color:#78716C;">${evento.tipo.toUpperCase()} &middot; ${evento.ciudad}</span></td>
</tr></table>
</td></tr>
<tr><td style="background:#1E0A2E;padding:40px 40px 32px;">
<p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#A78BFA;letter-spacing:0.14em;text-transform:uppercase;">&#x1F4C5; ${fechaEs} &middot; ${evento.ciudad}</p>
<h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#FFF8EF;line-height:1.2;">${icon} ${evento.nombre}</h1>
<p style="margin:0 0 24px;font-size:15px;color:#C4B5FD;line-height:1.6;">${evento.descripcion}</p>
<table cellpadding="0" cellspacing="0"><tr><td style="background:#FB923C;border-radius:8px;padding:12px 24px;">
<a href="https://tresycuarto.com/locales/${ciudadSlug}" style="color:#1C1917;font-weight:700;font-size:14px;text-decoration:none;">Ver todos los locales de ${evento.ciudad} &rarr;</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#ffffff;padding:28px 40px 8px;">
<h2 style="margin:0 0 6px;font-size:18px;font-weight:800;color:#1C1917;">Mientras esperas...</h2>
<p style="margin:0 0 20px;font-size:14px;color:#78716C;">${sinUbicacion
  ? `Selecci&oacute;n de locales para tardear en ${evento.ciudad}. <span style="color:#F59E0B;">&#9888; Este evento no tiene direcci&oacute;n concreta.</span>`
  : `${locales.length} locales a menos de ${evento.radio_m}m del evento.`
}</p>
</td></tr>
${tarjetas}
<tr><td style="background:#FFF8EF;border-top:1px solid #E7E5E4;padding:28px 40px;text-align:center;">
<p style="margin:0 0 20px;font-size:14px;color:#78716C;">Descubre m&aacute;s ciudades en tresycuarto.com</p>
<table cellpadding="0" cellspacing="0" align="center"><tr><td style="background:#1C1917;border-radius:8px;padding:14px 28px;">
<a href="https://tresycuarto.com" style="color:#FFF8EF;font-weight:700;font-size:14px;text-decoration:none;">Explorar todas las ciudades &rarr;</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#1C1917;border-radius:0 0 16px 16px;padding:24px 40px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><span style="font-size:16px;font-weight:800;color:#FB923C;letter-spacing:-0.03em;">tresycuarto</span><br>
<span style="font-size:11px;color:#78716C;"><a href="https://tresycuarto.com" style="color:#78716C;">tresycuarto.com</a> &middot; Cada d&iacute;a a las 15:15</span></td>
<td align="right" style="vertical-align:top;"><a href="{{ UnsubscribeURL }}" style="font-size:11px;color:#57534E;text-decoration:none;">Cancelar suscripci&oacute;n</a></td>
</tr></table>
</td></tr>
</table>
</td></tr>
</table>`;
}
