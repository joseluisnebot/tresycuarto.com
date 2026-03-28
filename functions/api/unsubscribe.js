const LISTMONK_URL = "https://listmonk.tresycuarto.com";

export async function onRequestGet(context) {
  const { request, env } = context;
  const uuid = new URL(request.url).searchParams.get("uuid");

  if (!uuid) {
    return new Response(renderPage("Error", "Enlace inválido."), { headers: { "Content-Type": "text/html" } });
  }

  const auth = btoa(`${env.LISTMONK_API_USER}:${env.LISTMONK_API_PASS}`);

  const cfAccessHeaders = {};
  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    cfAccessHeaders["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
    cfAccessHeaders["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
  }

  // Buscar suscriptor por UUID
  const searchRes = await fetch(`${LISTMONK_URL}/api/subscribers?query=uuid='${uuid}'&page=1&per_page=1`, {
    headers: { Authorization: `Basic ${auth}`, ...cfAccessHeaders },
  });

  if (!searchRes.ok) {
    return new Response(renderPage("Error", "No se pudo procesar la baja."), { headers: { "Content-Type": "text/html" } });
  }

  const data = await searchRes.json();
  const subscriber = data.data?.results?.[0];

  if (!subscriber) {
    return new Response(renderPage("Ya dado de baja", "Esta dirección no está en nuestra lista."), { headers: { "Content-Type": "text/html" } });
  }

  // Eliminar suscriptor de Listmonk
  await fetch(`${LISTMONK_URL}/api/subscribers/${subscriber.id}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${auth}`, ...cfAccessHeaders },
  });

  // Eliminar de D1 leads_app
  try {
    await env.DB.prepare("DELETE FROM leads_app WHERE email=?")
      .bind(subscriber.email.toLowerCase().trim())
      .run();
  } catch { /* silencioso */ }

  return new Response(renderPage("Baja confirmada", `Hemos eliminado <strong>${subscriber.email}</strong> de nuestra lista. No recibirás más emails de tresycuarto.`), {
    headers: { "Content-Type": "text/html" },
  });
}

function renderPage(title, message) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — tresycuarto</title>
<style>body{font-family:-apple-system,sans-serif;background:#FFF8EF;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:white;border-radius:1.25rem;border:1px solid #F5E6D3;padding:2.5rem;max-width:420px;width:90%;text-align:center;}
h1{font-size:1.3rem;font-weight:800;color:#1C1917;margin:0 0 1rem;}
p{color:#78716C;line-height:1.7;margin:0 0 1.5rem;}
a{display:inline-block;background:linear-gradient(135deg,#FB923C,#F59E0B);color:white;font-weight:700;text-decoration:none;padding:.75rem 1.5rem;border-radius:.75rem;}</style>
</head><body><div class="card">
<div style="font-size:1.6rem;font-weight:900;margin-bottom:1rem;"><span style="color:#1C1917">tres</span><span style="color:#FB923C">y</span><span style="color:#1C1917">cuarto</span></div>
<h1>${title}</h1><p>${message}</p>
<a href="https://tresycuarto.com">Volver al inicio</a>
</div></body></html>`;
}
