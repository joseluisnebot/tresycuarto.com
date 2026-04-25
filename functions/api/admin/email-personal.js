// Gestión de emails personales — aprobar (mover a email) o descartar
export async function onRequestPost(context) {
  const { env, request } = context;

  const token = new URL(request.url).searchParams.get("token");
  if (!token || token !== env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { local_id, accion } = await request.json();
  if (!local_id || !["aprobar", "descartar"].includes(accion)) {
    return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  if (accion === "aprobar") {
    // Mover email_personal → email (ya es válido para outreach)
    await env.DB.prepare(
      "UPDATE locales SET email = email_personal, email_personal = NULL WHERE id = ?"
    ).bind(local_id).run();
  } else {
    // Descartar — limpiar email_personal y marcar como enviado para no volver a ver
    await env.DB.prepare(
      "UPDATE locales SET email_personal = NULL, email_outreach_sent = 1 WHERE id = ?"
    ).bind(local_id).run();
  }

  return Response.json({ ok: true });
}
