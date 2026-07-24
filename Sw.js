// Film Beyni — minimal service worker
// Amaç: Android/Chrome'un "Ana ekrana ekle" davranışını ve app ikonunu
// düzgün göstermesi için PWA kurulabilirlik şartını sağlamak.
// Karmaşık bir önbellekleme stratejisi kurmuyoruz; sadece dosyaları
// çevrimdışı da açılabilsin diye temel bir cache-first yaklaşımı sunuyoruz.

const CACHE_NAME = "filmbeyni-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

