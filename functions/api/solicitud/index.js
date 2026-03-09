export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { nombre, ciudad, direccion, telefono, web, instagram, tiktok, horario, tipo,
          terraza, descripcion, contacto_email, contacto_nombre } = body;

  if (!nombre || !ciudad || !contacto_email) {
    return Response.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  // Guardar en D1
  await env.DB.prepare(`
    INSERT INTO solicitudes
      (nombre, ciudad, direccion, telefono, web, instagram, tiktok, horario, tipo, terraza, descripcion, contacto_email, contacto_nombre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    nombre, ciudad, direccion || null, telefono || null, web || null,
    instagram || null, tiktok || null, horario || null, tipo || "bar",
    terraza ? 1 : 0, descripcion || null, contacto_email, contacto_nombre || null
  ).run();

  if (env.BREVO_API_KEY) {
    const brevoHeaders = {
      "Content-Type": "application/json",
      "api-key": env.BREVO_API_KEY,
    };

    // Email de confirmación al solicitante
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: brevoHeaders,
      body: JSON.stringify({
        sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
        to: [{ email: contacto_email, name: contacto_nombre || nombre }],
        subject: "Hemos recibido tu solicitud — tresycuarto",
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1917">
            <h2 style="color:#FB923C">☀️ tresycuarto</h2>
            <p>Hola ${contacto_nombre || ""},</p>
            <p>Hemos recibido la solicitud para <strong>${nombre}</strong> en ${ciudad}. La revisaremos en breve y te contactaremos en este email.</p>
            <p style="color:#78716C;font-size:0.9rem">El equipo de tresycuarto ☀️</p>
          </div>
        `,
      }),
    });

    // Notificación interna a Jose Luis
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: brevoHeaders,
      body: JSON.stringify({
        sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
        to: [{ email: "JoseluisNebot@gmail.com", name: "Jose Luis" }],
        subject: `Nuevo local: ${nombre} (${ciudad})`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1917">
            <h2>Nuevo local solicitado</h2>
            <ul>
              <li><strong>Local:</strong> ${nombre}</li>
              <li><strong>Ciudad:</strong> ${ciudad}</li>
              <li><strong>Tipo:</strong> ${tipo}</li>
              <li><strong>Dirección:</strong> ${direccion || "—"}</li>
              <li><strong>Instagram:</strong> ${instagram || "—"}</li>
              <li><strong>TikTok:</strong> ${tiktok || "—"}</li>
              <li><strong>Web:</strong> ${web || "—"}</li>
              <li><strong>Terraza:</strong> ${terraza ? "Sí" : "No"}</li>
              <li><strong>Contacto:</strong> ${contacto_nombre || "—"} — ${contacto_email}</li>
            </ul>
            ${descripcion ? `<p><strong>Descripción:</strong> ${descripcion}</p>` : ""}
          </div>
        `,
      }),
    });
  }

  return Response.json({ ok: true });
}
