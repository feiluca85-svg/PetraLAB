// Service Worker di PetraLAB con supporto PWA, Notifiche Push e App Badge
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercetta richieste fetch per funzionamento offline/PWA
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Sei offline.', { status: 503 });
    })
  );
});

// Gestione notifiche Push dal server (anche ad app completamente chiusa)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'PetraLAB • Messaggio dal tuo Tutor',
    body: 'Hai un promemoria per i compiti o una verifica in arrivo!',
    url: '/',
    badgeCount: 1,
  };

  if (event.data) {
    try {
      payload = Object.assign(payload, event.data.json());
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  // Aggiorna il numerino / pallino rosso sull'icona dell'app se supportato
  if ('setAppBadge' in self.navigator && typeof payload.badgeCount === 'number') {
    if (payload.badgeCount > 0) {
      self.navigator.setAppBadge(payload.badgeCount).catch(() => {});
    } else {
      self.navigator.clearAppBadge().catch(() => {});
    }
  }

  const options = {
    body: payload.body,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/',
    },
    actions: [
      { action: 'open', title: 'Apri PetraLAB' },
      { action: 'dismiss', title: 'Più tardi' },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Clic sulla notifica: apre l'app e porta in primo piano
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Ricezione messaggi interni dalla pagina
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'SHOW_NOTIFICATION') {
    const options = {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [150, 50, 150],
      data: { url: data.url || '/' },
    };
    self.registration.showNotification(data.title || 'PetraLAB', options);
  } else if (data && data.type === 'SET_BADGE') {
    if ('setAppBadge' in self.navigator) {
      if (data.count > 0) {
        self.navigator.setAppBadge(data.count).catch(() => {});
      } else {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
  }
});
