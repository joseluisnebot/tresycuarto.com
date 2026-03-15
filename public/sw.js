const CACHE = 'tresycuarto-v3';
const SHELL = ['/', '/para-locales/', '/faq/', '/contacto/', '/privacidad/'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c =>
        // allSettled: un fallo individual no rompe la instalación
        Promise.allSettled(SHELL.map(url =>
          fetch(url).then(res => {
            if (res.ok) return c.put(url, res);
          }).catch(() => {})
        ))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  // Solo interceptar navegaciones y assets del mismo origen
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).catch(() => caches.match('/'));
      })
  );
});
