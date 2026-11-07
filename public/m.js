// Medición del embudo de tresycuarto (Analytics Engine vía /api/m).
// Sin cookies ni identificadores: solo qué pasa en cada página. Pasos:
//   vista → form_visto (el alta llega a verse) → form_enviado → (alta_ok, lo apunta el servidor)
//   y clic_local: clic desde una ruta o ciudad hacia la ficha de un bar.
(function () {
  if (navigator.webdriver) return;
  var enviar = function (e, extra) {
    var datos = JSON.stringify({ e: e, p: location.pathname, x: extra || "" });
    try {
      if (!navigator.sendBeacon || !navigator.sendBeacon("/api/m", datos)) {
        fetch("/api/m", { method: "POST", body: datos, keepalive: true });
      }
    } catch (_) {}
  };

  enviar("vista", document.referrer ? new URL(document.referrer).hostname : "");

  // Navegación interna de Next (sin recarga): también es una vista
  var push = history.pushState;
  history.pushState = function () {
    var antes = location.pathname;
    push.apply(this, arguments);
    if (location.pathname !== antes) setTimeout(function () { enviar("vista", "interna"); }, 0);
  };

  // Formularios de alta (los que piden email): visto una vez, enviado
  var vistos = new WeakSet();
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) {
      if (en.isIntersecting && !vistos.has(en.target)) { vistos.add(en.target); enviar("form_visto"); io.unobserve(en.target); }
    });
  }, { threshold: 0.5 }) : null;
  var buscar = function () {
    document.querySelectorAll("form").forEach(function (f) {
      if (f.__m || !f.querySelector('input[type="email"]')) return;
      f.__m = 1;
      if (io) io.observe(f);
      f.addEventListener("submit", function () { enviar("form_enviado"); });
    });
  };
  buscar();
  new MutationObserver(buscar).observe(document.documentElement, { childList: true, subtree: true });

  // Clic hacia la ficha de un bar (/locales/<ciudad>/<slug>)
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    var u = new URL(a.href, location.href);
    if (u.host === location.host && /^\/locales\/[^/]+\/[^/]+/.test(u.pathname)) enviar("clic_local", u.pathname);
  }, true);
})();
