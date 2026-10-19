// KAFEO POS · notification helper.
// Only shows order pop-ups and brings the POS to the front when one is tapped.
// It does NOT cache anything, so updates to the POS still load straight away.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL('./#orders', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const pos = wins.find((w) => w.url.startsWith(self.registration.scope));
    if (pos) {
      await pos.focus();
      pos.postMessage({ type: 'kafeo-open-web-orders' });
    } else {
      await self.clients.openWindow(target);
    }
  })());
});
