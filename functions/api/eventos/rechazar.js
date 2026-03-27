export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url);
  const id     = url.searchParams.get("id");
  const token  = url.searchParams.get("token");

  if (!id || token !== "admin") {
    return new Response("No autorizado", { status: 403 });
  }

  await env.DB.prepare(
    "UPDATE eventos_geo SET estado='rechazado' WHERE id=?"
  ).bind(id).run();

  return new Response(`<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>body{font-family:sans-serif;background:#F5F0E8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
.box{background:#fff;border-radius:16px;padding:40px;text-align:center;max-width:400px;}
.ok{font-size:48px;margin-bottom:16px;}
h2{color:#1C1917;margin:0 0 8px;}p{color:#78716C;font-size:14px;}</style>
</head><body>
<div class="box">
  <div class="ok">✅</div>
  <h2>Evento rechazado</h2>
  <p>El evento <strong>${id}</strong> ha sido marcado como rechazado y no se enviará a los suscriptores.</p>
</div>
</body></html>`, {
    status: 200,
    headers: { "Content-Type": "text/html;charset=UTF-8" },
  });
}
