// Service worker mínimo: deixa o app instalável e abrir offline as telas já visitadas.
// Só mexe em GET do próprio domínio — a API (outro domínio) nunca passa pelo cache,
// então dados de aluno não ficam guardados aqui.
const CACHE_NAME = "triunfo-v1";
const PRECACHE = ["/", "/login/", "/cursos/", "/manifest.webmanifest", "/logo.png", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// Rede primeiro; se cair, usa o que estiver no cache.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached ?? (request.mode === "navigate" ? caches.match("/cursos/") : undefined)),
      ),
  );
});
