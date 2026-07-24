// Film Beyni — servis çalışanı
// ÖNEMLİ: Önceki sürüm "cache-first" çalışıyordu — yani siz dosyaları
// güncelleseniz bile telefon hep eski, önbelleklenmiş kopyayı gösteriyordu.
// Şimdi "network-first" stratejisine geçiyoruz: her zaman önce internetten
// en güncel dosyayı çekmeye çalışır, sadece çevrimdışıysanız (internet
// yoksa) önbellekteki son bilinen kopyayı gösterir.

const CACHE_NAME = "filmbeyni-v2"; // sürüm değişti -> eski önbellek tamamen temizlenecek
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
  if(event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // İnternetten başarıyla geldi -> önbelleği bu en güncel kopyayla tazele
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return networkResponse;
      })
      .catch(() => caches.match(event.request)) // sadece çevrimdışıyken önbelleğe düş
  );
});
