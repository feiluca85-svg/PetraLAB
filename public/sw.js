self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  return self.clients.claim();
});

// È obbligatorio intercettare le richieste 'fetch' affinché Chrome su Android abiliti il tasto "Installa"
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => {
    return new Response('Sei offline.', { status: 503 });
  }));
});
