export async function onRequestPost(context) {
  const { env, request } = context;

  const token = new URL(request.url).searchParams.get("token");
  if (!token || token !== env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, accion } = await request.json();
  if (!id || !["aceptar", "descartar"].includes(accion)) {
    return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const { results } = await env.DB.prepare("SELECT * FROM solicitudes WHERE id = ?").bind(id).all();
  if (!results.length) {
    return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (accion === "aceptar") {
    const s = results[0];

    if (s.tipo_solicitud === "claim" && s.local_id) {
      // Claim: marcar local existente como verificado
      await env.DB.prepare("UPDATE locales SET claimed = 1 WHERE id = ?").bind(s.local_id).run();

      // Email de confirmación al propietario
      if (env.BREVO_API_KEY && s.contacto_email) {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": env.BREVO_API_KEY },
          body: JSON.stringify({
            sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
            to: [{ email: s.contacto_email, name: s.contacto_nombre || s.nombre }],
            subject: `✅ Ficha verificada: ${s.nombre} — tresycuarto`,
            htmlContent: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1917">
                <h2 style="color:#FB923C">☀️ tresycuarto</h2>
                <p>Hola ${s.contacto_nombre || ""},</p>
                <p>Tu ficha de <strong>${s.nombre}</strong> en ${s.ciudad} ha sido verificada. Ya aparece con el sello ✅ en tresycuarto.com.</p>
                <p style="color:#78716C;font-size:0.9rem">El equipo de tresycuarto ☀️</p>
              </div>
            `,
          }),
        });
      }
    } else {
      // Nuevo local: insertar en D1
      const localId = `solicitud_${id}_${Date.now()}`;
      await env.DB.prepare(`
        INSERT OR IGNORE INTO locales (id, nombre, tipo, ciudad, direccion, telefono, web, instagram, horario, terraza, fuente)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'solicitud')
      `).bind(
        localId, s.nombre, s.tipo || null, s.ciudad, s.direccion || null,
        s.telefono || null, s.web || null, s.instagram || null,
        s.horario || null, s.terraza ? 1 : 0
      ).run();
    }
  }

  await env.DB.prepare("DELETE FROM solicitudes WHERE id = ?").bind(id).run();

  return Response.json({ ok: true });
}
