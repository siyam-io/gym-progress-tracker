const CACHE_NAME = "pulse-gym-v4";
const EXERCISE_IMAGES_CACHE = "exercise-images-v1";

const PRECACHE_ASSETS = [
  "/",
  "/workout/active",
  "/history",
  "/analytics",
  "/exercises",
  "/manifest.json",
  "/icon.svg",
];

// Install: Cache critical shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[PWA SW] Precache failed, proceeding with runtime caching:", err);
      })
  );
});

// Activate: Clean up old caches but preserve dedicated exercise-images-v1 cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== EXERCISE_IMAGES_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Offline-first & Cache-First for Exercise Diagrams
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Guard against non-http/https schemes (e.g., chrome-extension://, moz-extension://, blob:, data:)
  if (!request.url.startsWith("http://") && !request.url.startsWith("https://")) {
    return;
  }

  const url = new URL(request.url);

  // Skip non-GET, internal API mutations, Next.js RSC flight requests, and HMR
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.searchParams.has("_rsc") ||
    request.headers.get("rsc") === "1" ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // 1. Exercise Images & Anatomical Diagrams: Cache-First strategy
  const isImageRequest =
    request.destination === "image" ||
    url.hostname.includes("images.unsplash.com") ||
    url.hostname.includes("wikimedia.org") ||
    url.hostname.includes("raw.githubusercontent.com") ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(png|jpg|jpeg|webp|svg|gif)($|\?)/i.test(url.pathname);

  if (isImageRequest) {
    event.respondWith(
      caches.open(EXERCISE_IMAGES_CACHE).then(async (cache) => {
        try {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          const networkResponse = await fetch(request);
          if (
            (networkResponse.ok || networkResponse.type === "opaque") &&
            (request.url.startsWith("http://") || request.url.startsWith("https://"))
          ) {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (fetchErr) {
          // Fallback if offline and not in cache
          const cached = await cache.match(request).catch(() => null);
          return (
            cached ||
            new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="m6.5 6.5 11 11M21 21l-1-1M3 3l1 1M18 22l-3-3M6 2l3 3M2 6l3 3M22 18l-3-3"/></svg>',
              { headers: { "Content-Type": "image/svg+xml" } }
            )
          );
        }
      })
    );
    return;
  }

  // 2. Navigation requests (HTML pages): Network-First with Cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && (request.url.startsWith("http://") || request.url.startsWith("https://"))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone).catch(() => {}));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request).catch(() => null);
          if (cached) return cached;

          const shell = await caches.match("/").catch(() => null);
          return shell || new Response("Offline Gym Tracker", { headers: { "Content-Type": "text/html" } });
        })
    );
    return;
  }

  // 3. Static assets (JS, CSS, fonts): Stale-While-Revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok && (request.url.startsWith("http://") || request.url.startsWith("https://"))) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone).catch(() => {}));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default network with cache fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    }).catch(() => fetch(request))
  );
});
