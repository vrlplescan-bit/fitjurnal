// Service worker: păstrează aplicația în cache ca să meargă și offline.
// Schimbă VERSION de fiecare dată când modifici fișierele aplicației.
const VERSION = "fitjurnal-v12";
const FILES = ["./", "./index.html", "./style.css", "./app.js", "./health.js", "./calories.js", "./foods.js", "./nutrition.js", "./manifest.json",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  // cache: "reload" = ia fișierele direct de pe server, nu din memoria browserului
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Întâi rețeaua (ca să vezi mereu ultima versiune), cache-ul când ești offline.
// GitHub Pages cere browserului să țină fișierele 10 minute; "no-cache" verifică mereu serverul.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // ex. GitHub API: direct, fără cache
  e.respondWith(
    fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" })
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Atingerea unei notificări deschide aplicația
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((list) =>
    list.length ? list[0].focus() : self.clients.openWindow("./")));
});
