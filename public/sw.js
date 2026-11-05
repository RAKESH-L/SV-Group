/* Sri Vinayaka Groups PWA — minimal offline handling.
 * Never persist authenticated pages, customer selections, APIs, enquiry forms,
 * user-uploaded product images, or price-bearing HTML.
 */
const VERSION = "sv-pwa-v1";
const STATIC_CACHE = VERSION + "-public-static";
const OFFLINE_CACHE = VERSION + "-offline";
const OFFLINE_PAGE = "/offline.html";
const MAX_STATIC_ITEMS = 60;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then(cache => cache.add(OFFLINE_PAGE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("sv-pwa-") && key !== STATIC_CACHE && key !== OFFLINE_CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isPublicStatic(url) {
  return url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/branding/ganesh-approved.svg" ||
    url.pathname === "/branding/diamond-original.svg";
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for ALL navigation requests. Never cache a response for a
  // page, even if the user visited it online. Only a static, generic offline
  // message is available while disconnected.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        return (await caches.match(OFFLINE_PAGE)) ||
          new Response("SV Groups is offline. Reconnect to browse the latest catalogue.", {
            status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
      }
    })());
    return;
  }

  // Only versioned Next.js JS/CSS/font files and two public branding SVGs may
  // be stored offline. No /api, /admin, /cart, dynamic product images, or HTML.
  if (!isPublicStatic(url) || request.headers.has("authorization")) return;
  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const existing = await cache.match(request);
    if (existing) return existing;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic" && !response.headers.has("set-cookie") &&
          !/private|no-store/i.test(response.headers.get("cache-control") || "")) {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        if (keys.length > MAX_STATIC_ITEMS) await cache.delete(keys[0]);
      }
      return response;
    } catch {
      return existing || Response.error();
    }
  })());
});
