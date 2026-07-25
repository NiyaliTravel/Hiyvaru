// Hiyvaru service worker: minimal offline shell + web push.
// Deliberately does NOT cache chat API responses (privacy: nothing sensitive
// may persist in cache storage).
const CACHE = "hiyvaru-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Network-first for everything; cache fallback only for the static shell.
  if (event.request.method !== "GET" || url.pathname.startsWith("/api") || url.pathname.startsWith("/socket.io")) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((r) => r ?? caches.match("/"))),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}
  const title = data.title || "Hiyvaru";
  event.waitUntil(
    self.registration.showNotification(title, {
      // Notification bodies are deliberately generic — no chat content.
      body: data.body || "",
      icon: "/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
