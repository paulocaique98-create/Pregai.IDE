// Service worker do Pregai.
// - HTML / navegação: sempre rede (nunca serve página velha).
// - Assets estáticos imutáveis (/_next/static, fontes, imagens): cache-first.
const VERSION = "pregai-v2";
const ASSET_CACHE = `${VERSION}-assets`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação / documentos: rede sempre.
  if (request.mode === "navigate" || request.destination === "document") {
    return;
  }

  // Assets versionados: cache-first.
  const isImmutable =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico)$/.test(url.pathname);
  if (!isImmutable) return;

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok) cache.put(request, res.clone());
      return res;
    }),
  );
});
