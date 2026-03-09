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

  await env.DB.prepare("DELETE FROM solicitudes WHERE id = ?").bind(id).run();

  return Response.json({ ok: true });
}
