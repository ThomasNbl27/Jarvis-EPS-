/* =====================================================================
   sw.js — service worker
   Met l'application en cache pour qu'elle fonctionne sans connexion
   (gymnase, stade, sous-sol...). Les données restent dans le navigateur.
   ===================================================================== */
var CACHE = "jarvis-eps-v1.3.0";

var FICHIERS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/css/app.css",
  "assets/js/utils.js",
  "assets/js/store.js",
  "assets/js/seed.js",
  "assets/js/eps.js",
  "assets/js/speech.js",
  "assets/js/ui.js",
  "assets/js/verrou.js",
  "assets/js/exports.js",
  "assets/js/pdf.js",
  "assets/js/ics.js",
  "assets/js/rappels.js",
  "assets/js/views/accueil.js",
  "assets/js/views/seances.js",
  "assets/js/views/eleves.js",
  "assets/js/views/base.js",
  "assets/js/views/pdf.js",
  "assets/js/views/agenda.js",
  "assets/js/views/reglages.js",
  "assets/js/app.js",
  "assets/icons/favicon.svg",
  "assets/icons/favicon-32.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(FICHIERS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (cles) {
        return Promise.all(cles.filter(function (c) { return c !== CACHE; })
                               .map(function (c) { return caches.delete(c); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* Réseau d'abord pour la navigation (mise à jour immédiate),
   cache d'abord pour les ressources (rapidité et hors-ligne). */
/* Un appui sur une notification ramène à l'agenda. */
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (liste) {
      for (var i = 0; i < liste.length; i++) {
        if ("focus" in liste[i]) return liste[i].focus();
      }
      if (clients.openWindow) return clients.openWindow("./#agenda");
    })
  );
});

self.addEventListener("fetch", function (e) {
  var requete = e.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== location.origin) return;

  if (requete.mode === "navigate") {
    e.respondWith(
      fetch(requete)
        .then(function (reponse) {
          var copie = reponse.clone();
          caches.open(CACHE).then(function (c) { c.put("index.html", copie); });
          return reponse;
        })
        .catch(function () {
          return caches.match("index.html").then(function (r) { return r || caches.match("./"); });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(requete).then(function (cache) {
      return cache || fetch(requete).then(function (reponse) {
        if (reponse && reponse.status === 200 && reponse.type === "basic") {
          var copie = reponse.clone();
          caches.open(CACHE).then(function (c) { c.put(requete, copie); });
        }
        return reponse;
      });
    })
  );
});
