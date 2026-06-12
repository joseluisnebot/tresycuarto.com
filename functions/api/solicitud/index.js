const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Email al propietario con el enlace para crear su cuenta y gestionar la ficha
function emailRegistro(brevoHeaders, contacto_email, contacto_nombre, nombre, ciudad, localId) {
  const registerUrl = `https://tresycuarto.com/local/registro?local_id=${encodeURIComponent(localId)}&email=${encodeURIComponent(contacto_email)}`;
  return fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: brevoHeaders,
    body: JSON.stringify({
      sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
      to: [{ email: contacto_email, name: contacto_nombre || nombre }],
      subject: `✅ Ya puedes gestionar ${esc(nombre)} en tresycuarto`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1917;padding:2rem">
          <p style="font-size:1.5rem;font-weight:800">tres<span style="color:#FB923C">y</span>cuarto</p>
          <h2 style="color:#1C1917;margin-bottom:0.5rem">¡Tu ficha está lista! 🎉</h2>
          <p style="color:#78716C;margin-bottom:1.5rem">Hola ${esc(contacto_nombre || "")},</p>
          <p style="color:#44403C;margin-bottom:1rem">Ya puedes crear tu cuenta y gestionar <strong>${esc(nombre)}</strong> en ${esc(ciudad)}.</p>
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
        </div>`,
    }),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { nombre, ciudad, direccion, telefono, web, instagram, tiktok, horario, tipo,
          terraza, descripcion, contacto_email, contacto_nombre,
          local_id, tipo_solicitud } = body;

  if (!nombre || !ciudad || !contacto_email) {
    return Response.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const esClaim = tipo_solicitud === "claim";
  const brevoHeaders = env.BREVO_API_KEY
    ? { "Content-Type": "application/json", "api-key": env.BREVO_API_KEY }
    : null;

  // ── CLAIM de ficha existente → AUTO-OTORGADO ──────────────────────────────
  // El dueño recibe al instante el enlace para crear su cuenta. La cuenta queda
  // sin verificar hasta que confirme su email (safeguard anti-bots). Se avisa al
  // admin de cada claim por si hubiera que intervenir.
  if (esClaim && local_id) {
    const { results: loc } = await env.DB.prepare(
      "SELECT id, nombre, ciudad FROM locales WHERE id = ?"
    ).bind(local_id).all();
    if (!loc.length) return Response.json({ error: "Local no encontrado" }, { status: 404 });

    const { results: yaTiene } = await env.DB.prepare(
      "SELECT id FROM usuario_locales WHERE local_id = ?"
    ).bind(local_id).all();
    if (yaTiene.length) {
      return Response.json({ error: "Este local ya tiene un propietario registrado" }, { status: 409 });
    }

    await env.DB.prepare("UPDATE locales SET claimed = 1 WHERE id = ?").bind(local_id).run();

    if (brevoHeaders) {
      // Enlace de registro al propietario (acceso inmediato)
      await emailRegistro(brevoHeaders, contacto_email, contacto_nombre, nombre, ciudad, local_id);
      // Aviso informativo al admin
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: brevoHeaders,
        body: JSON.stringify({
          sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
          to: [{ email: "JoseluisNebot@gmail.com", name: "Jose Luis" }],
          subject: `🔑 Claim auto-otorgado: ${esc(nombre)} (${esc(ciudad)})`,
          htmlContent: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1917">
              <h2>🔑 Claim auto-otorgado</h2>
              <p>Se ha otorgado automáticamente la gestión de una ficha existente. Si algo no cuadra, puedes revertirlo.</p>
              <ul>
                <li><strong>Local ID:</strong> ${esc(local_id)}</li>
                <li><strong>Local:</strong> ${esc(nombre)}</li>
                <li><strong>Ciudad:</strong> ${esc(ciudad)}</li>
                <li><strong>Contacto:</strong> ${esc(contacto_nombre || "—")} — ${esc(contacto_email)}</li>
              </ul>
              <p><a href="https://tresycuarto.com/locales/-/${encodeURIComponent(local_id)}">Ver ficha →</a></p>
            </div>`,
        }),
      });
    }

    return Response.json({ ok: true, auto: true });
  }

  // ── LOCAL NUEVO → cola para revisión del admin ────────────────────────────
  await env.DB.prepare(`
    INSERT INTO solicitudes
      (nombre, ciudad, direccion, telefono, web, instagram, tiktok, horario, tipo, terraza, descripcion, contacto_email, contacto_nombre, local_id, tipo_solicitud)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    nombre, ciudad, direccion || null, telefono || null, web || null,
    instagram || null, tiktok || null, horario || null, tipo || "bar",
    terraza ? 1 : 0, descripcion || null, contacto_email, contacto_nombre || null,
    local_id || null, tipo_solicitud || "nuevo"
  ).run();

  if (brevoHeaders) {
    // Confirmación al solicitante
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: brevoHeaders,
      body: JSON.stringify({
        sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
        to: [{ email: contacto_email, name: contacto_nombre || nombre }],
        subject: "Hemos recibido tu solicitud — tresycuarto",
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1917">
            <h2 style="color:#FB923C">☀️ tresycuarto</h2>
            <p>Hola ${esc(contacto_nombre || "")},</p>
            <p>Hemos recibido la solicitud para <strong>${esc(nombre)}</strong> en ${esc(ciudad)}. La revisaremos en breve y te contactaremos en este email.</p>
            <p style="color:#78716C;font-size:0.9rem">El equipo de tresycuarto ☀️</p>
          </div>`,
      }),
    });

    // Notificación interna a Jose Luis
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: brevoHeaders,
      body: JSON.stringify({
        sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
        to: [{ email: "JoseluisNebot@gmail.com", name: "Jose Luis" }],
        subject: `Nuevo local: ${esc(nombre)} (${esc(ciudad)})`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1917">
            <h2>Nuevo local solicitado</h2>
            <ul>
              <li><strong>Local:</strong> ${esc(nombre)}</li>
              <li><strong>Ciudad:</strong> ${esc(ciudad)}</li>
              <li><strong>Tipo:</strong> ${esc(tipo)}</li>
              <li><strong>Dirección:</strong> ${esc(direccion || "—")}</li>
              <li><strong>Instagram:</strong> ${esc(instagram || "—")}</li>
              <li><strong>TikTok:</strong> ${esc(tiktok || "—")}</li>
              <li><strong>Web:</strong> ${esc(web || "—")}</li>
              <li><strong>Terraza:</strong> ${terraza ? "Sí" : "No"}</li>
              <li><strong>Contacto:</strong> ${esc(contacto_nombre || "—")} — ${esc(contacto_email)}</li>
            </ul>
            ${descripcion ? `<p><strong>Descripción:</strong> ${esc(descripcion)}</p>` : ""}
          </div>`,
      }),
    });
  }

  return Response.json({ ok: true });
}
