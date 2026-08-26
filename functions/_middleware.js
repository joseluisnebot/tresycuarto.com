// Redirección www → apex.
//
// www.tresycuarto.com está dado de alta como dominio personalizado del proyecto
// Pages, así que servía el sitio entero con 200: cada página tenía un gemelo
// exacto y Google las contaba como duplicadas.
//
// No se puede resolver en public/_redirects (sólo hace match por ruta, nunca por
// dominio) ni con una Redirect Rule de zona (el token de API no tiene permiso de
// Rulesets). Aquí sí tenemos el host de la petición.
//
// Ojo: esto sólo cubre las rutas que invocan Functions. Las excluidas en
// public/_routes.json (/faq, /contacto, /privacidad, /unete, /para-locales,
// /rutas/*, /local/*, estáticos) se sirven sin pasar por aquí; en esas, el
// duplicado lo resuelve la etiqueta canonical.
export async function onRequest(context) {
  const { request, next } = context;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return next();
  }

  if (url.hostname === "www.tresycuarto.com") {
    url.hostname = "tresycuarto.com";
    return Response.redirect(url.toString(), 301);
  }

  return next();
}
