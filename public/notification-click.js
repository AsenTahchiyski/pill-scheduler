// Loaded into the generated service worker via workbox.importScripts.
// Tapping a dose reminder focuses an open app window, or opens a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow(self.registration.scope);
      })
  );
});
