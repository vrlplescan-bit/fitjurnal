// Service worker: păstrează aplicația în cache ca să meargă și offline.
// Schimbă VERSION de fiecare dată când modifici fișierele aplicației.
const VERSION = "fitjurnal-v6";
const FILES = ["./", "./index.html", "./style.css", "./app.js", "./health.js", "./manifest.json",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Întâi rețeaua (ca să vezi mereu ultima versiune), cache-ul când ești offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
