/**
 * POST /api/admin/evento?token=X
 * Body: { id, accion: "aprobar" | "rechazar" }
 * Aprueba o rechaza un evento_geo pendiente desde el dashboard admin.
 * No envía emails — la notificación es el cron diario.
 */
export async function onRequestPost(context) {
  const { env, request } = context;

  const token = new URL(request.url).searchParams.get("token");
  if (!token || token !== env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { id, accion } = body;
  if (!id || !["aprobar", "rechazar"].includes(accion)) {
    return Response.json({ error: "Faltan campos" }, { status: 400 });
  }

  const estado = accion === "aprobar" ? "aprobado" : "rechazado";
  await env.DB.prepare(
    "UPDATE eventos_geo SET estado = ?, token_aprobacion = NULL WHERE id = ? AND estado IN ('pendiente', 'revision_enviada')"
  ).bind(estado, id).run();

  return Response.json({ ok: true, estado });
}
