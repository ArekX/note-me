const CACHE = "noteme-__BUILD_ID__";

// Security invariant: these carry user data or start downloads and are never
// cached or answered from a cache.
const NETWORK_ONLY = ["/api/", "/file/", "/ws"];

const isHtml = (response) =>
    (response.headers.get("Content-Type") ?? "").startsWith("text/html");

// The server answers a missing file with index.html (SPA fallback), and a
// redirected response cannot answer a navigation.
const isCacheable = (response) =>
    response.status === 200 && !response.redirected && !isHtml(response);

const fromNetworkFirst = async (request) => {
    try {
        const response = await fetch(request);
        if (
            response.status === 200 &&
            !response.redirected &&
            isHtml(response)
        ) {
            const cache = await caches.open(CACHE);
            await cache.put("/", response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match("/", { cacheName: CACHE });
        if (cached) {
            return cached;
        }
        throw error;
    }
};

const fromCacheFirst = async (request) => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }
    const response = await fetch(request);
    if (isCacheable(response)) {
        await cache.put(request, response.clone());
    }
    return response;
};

const fromCacheThenRevalidate = async (event, request) => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    const update = fetch(request).then(async (response) => {
        if (isCacheable(response)) {
            await cache.put(request, response.clone());
        }
        return response;
    });
    if (cached) {
        event.waitUntil(update.catch(() => undefined));
        return cached;
    }
    return update;
};

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.add("/"))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names
                        .filter(
                            (name) =>
                                name.startsWith("noteme-") && name !== CACHE,
                        )
                        .map((name) => caches.delete(name)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (
        request.method !== "GET" ||
        url.origin !== self.location.origin ||
        NETWORK_ONLY.some((prefix) => url.pathname.startsWith(prefix))
    ) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(fromNetworkFirst(request));
    } else if (url.pathname.startsWith("/assets/")) {
        event.respondWith(fromCacheFirst(request));
    } else {
        event.respondWith(fromCacheThenRevalidate(event, request));
    }
});
