"use strict";

const scope = new URL(self.registration.scope);
const index = new URL("index.html", scope).href;
const cachePrefix = "isla-regleta:" + scope.pathname + ":";
const cacheName = cachePrefix + "1";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.add(new Request(index, { cache: "reload" }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(cachePrefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.mode !== "navigate" || request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || ![scope.pathname, new URL(index).pathname].includes(url.pathname)) return;
  event.respondWith(openGame(request));
});

async function openGame(request) {
  const cache = await caches.open(cacheName);
  let response;
  try {
    response = await fetch(request, { cache: "no-cache" });
  } catch {
    return (await cache.match(index)) || Response.error();
  }
  if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
    try {
      await cache.put(index, response.clone());
    } catch {
      // The network response is still usable if storage is full or unavailable.
    }
  }
  return response;
}
