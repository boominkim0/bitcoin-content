const CACHE_NAME = "bitcoin-content-pwa-v1"

function scopePath(path = "") {
  const scope = new URL(self.registration.scope).pathname
  return `${scope}${path}`.replace(/\/{2,}/g, "/")
}

const PRECACHE_URLS = [
  scopePath(),
  scopePath("index.html"),
  scopePath("manifest.webmanifest"),
  scopePath("favicon.svg"),
  scopePath("favicon-32.png"),
  scopePath("apple-touch-icon.png"),
  scopePath("pwa-icon-192.png"),
  scopePath("pwa-icon-512.png"),
  scopePath("share-thumbnail.png"),
  scopePath("korean-stone-pagoda-bg.png"),
  scopePath("korean-stone-pagoda-wide-bg.png"),
  scopePath("new-block-chime.wav")
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.includes("/api/")) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(scopePath(), copy))
          return response
        })
        .catch(() => caches.match(scopePath()))
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)

      return cached || fresh
    })
  )
})
