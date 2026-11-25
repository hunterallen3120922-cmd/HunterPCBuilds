/*
 * Service worker for the installed admin app (admin.html only; the public site never uses it).
 * - Page: always tries the network first, so a new version shows up right away; offline it opens the saved copy.
 * - assets/ files have a hash in their name, so a saved copy never goes stale: served from the cache.
 * - Supabase (all your data) and anything not on this site is never cached.
 */
const CACHE = "hpb-admin-v1";

// Save the page right away so the app opens even if the first launch after installing is offline.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const page = new URL("admin.html", self.registration.scope).href;
    const res = await fetch(page);
    if (!res.ok) return;
    const html = await res.clone().text();
    const cache = await caches.open(CACHE);
    await cache.put(page, res);
    // and the files the page starts with (its script, styles and their shared pieces)
    const files = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => new URL(m[1], page).href);
    await cache.addAll(files);
  })().catch(() => {}));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("hpb-admin-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(fallbackKey ?? request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(fallbackKey ?? request, { ignoreVary: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, new URL("admin.html", self.registration.scope).href));
  } else if (url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirst(request));
  } else if (/\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request));
  }
});
