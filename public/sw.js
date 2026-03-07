// public/sw.js — Service Worker untuk PWA Push Notification
const CACHE = "prokopim-v1";
const OFFLINE_URL = "/";

// ── Install: cache halaman utama ──
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(["/", "/logo_tarakan.png"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(clients.claim());
});

// ── Fetch: network-first, fallback cache ──
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── Push: tampilkan notifikasi ──
self.addEventListener("push", e => {
  let data = {};
  try { data = e.data?.json() || {}; } catch {}

  const title  = data.title  || "Prokopim Tarakan";
  const body   = data.body   || "Ada pembaruan jadwal";
  const url    = data.url    || "/";
  const icon   = "/logo_tarakan.png";
  const badge  = "/logo_tarakan.png";
  const tag    = data.tag    || "prokopim-" + Date.now();

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      requireInteraction: false,
      data: { url },
      actions: [
        { action: "open",    title: "Buka Aplikasi" },
        { action: "dismiss", title: "Tutup" },
      ],
    })
  );
});

// ── Notification click ──
self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.action === "dismiss") return;
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(cls => {
      // Fokus ke tab yang sudah terbuka jika ada
      for (const c of cls) {
        if (c.url.includes(self.location.origin)) {
          c.focus();
          c.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
