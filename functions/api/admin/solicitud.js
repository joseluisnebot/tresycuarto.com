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

      // Email al propietario con enlace para crear su cuenta
      if (env.BREVO_API_KEY && s.contacto_email) {
        const registerUrl = `https://tresycuarto.com/local/registro?local_id=${encodeURIComponent(s.local_id)}&email=${encodeURIComponent(s.contacto_email)}`;
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": env.BREVO_API_KEY },
          body: JSON.stringify({
            sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
            to: [{ email: s.contacto_email, name: s.contacto_nombre || s.nombre }],
            subject: `✅ Solicitud aprobada: ya puedes gestionar ${s.nombre} en tresycuarto`,
            htmlContent: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1917;padding:2rem">
                <p style="font-size:1.5rem;font-weight:800">tres<span style="color:#FB923C">y</span>cuarto</p>
                <h2 style="color:#1C1917;margin-bottom:0.5rem">¡Tu ficha ha sido aprobada! 🎉</h2>
                <p style="color:#78716C;margin-bottom:1.5rem">Hola ${s.contacto_nombre || ""},</p>
                <p style="color:#44403C;margin-bottom:1rem">Hemos verificado que eres el propietario de <strong>${s.nombre}</strong> en ${s.ciudad}. Ya puedes crear tu cuenta y gestionar tu ficha.</p>
                <p style="color:#44403C;margin-bottom:1.5rem">Con tu cuenta podrás:</p>
                <ul style="color:#44403C;margin-bottom:1.5rem;padding-left:1.2rem;line-height:1.8">
                  <li>📸 Subir fotos de tu local</li>
                  <li>🕐 Actualizar horarios y datos</li>
                  <li>📅 Publicar eventos y promociones</li>
                  <li>📊 Ver estadísticas de visitas</li>
                </ul>
                <a href="${registerUrl}" style="display:inline-block;padding:0.9rem 2rem;background:linear-gradient(135deg,#FB923C,#F59E0B);color:white;font-weight:700;text-decoration:none;border-radius:0.75rem;font-size:1rem">
                  Crear mi cuenta →
                </a>
                <p style="color:#A8A29E;font-size:0.8rem;margin-top:2rem">El equipo de tresycuarto ☀️</p>
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
