/* WebPad++ Service Worker
 * Provides a local-first cache after the first successful online visit.
 * Requires HTTPS or localhost; it is not available when opened directly with file://.
 */
const WEBCODING_SW_VERSION = '2026-05-20-pwa1';
const CACHE_PREFIX = 'webcoding-cache-';
const APP_CACHE = `${CACHE_PREFIX}${WEBCODING_SW_VERSION}`;
const MANIFEST_URL = 'offline-assets.json';
const FALLBACK_CORE_ASSETS = [
  './',
  'index.html',
  'favicon.ico',
  'manifest.webmanifest',
  'css/style.css',
  'css/offline-fallback.css',
  'js/core/app.js',
  'js/core/loader.js',
  'js/core/offline.js',
  'js/editor.js'
];
const CACHEABLE_REMOTE_HOSTS = [
  'tessdata.projectnaptha.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com'
];

function normalizeUrl(url) {
  try { return new URL(url, self.location.href).href; }
  catch (err) { return url; }
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function isSameOrigin(url) {
  try { return new URL(url, self.location.href).origin === self.location.origin; }
  catch (err) { return false; }
}

function isCacheableRemote(url) {
  try {
    const parsed = new URL(url, self.location.href);
    return CACHEABLE_REMOTE_HOSTS.includes(parsed.hostname);
  } catch (err) {
    return false;
  }
}

async function readAssetManifest() {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (response.ok) {
      await cache.put(MANIFEST_URL, response.clone());
      return await response.json();
    }
  } catch (err) {
    const cached = await cache.match(MANIFEST_URL);
    if (cached) {
      try { return await cached.json(); }
      catch (jsonErr) { /* ignore malformed cached manifest */ }
    }
  }
  return { core: FALLBACK_CORE_ASSETS, ocr: [] };
}

async function cacheOne(url, options = {}) {
  const href = normalizeUrl(url);
  const sameOrigin = isSameOrigin(href);
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(href);
  if (cached && !options.refresh) return { url: href, ok: true, cached: true };

  const requestInit = sameOrigin
    ? { cache: options.refresh ? 'reload' : 'default', credentials: 'same-origin' }
    : { cache: options.refresh ? 'reload' : 'default', mode: 'cors', credentials: 'omit' };

  try {
    const response = await fetch(href, requestInit);
    if (!response || (!response.ok && response.type !== 'opaque')) {
      throw new Error(`HTTP ${response && response.status}`);
    }
    await cache.put(href, response.clone());
    return { url: href, ok: true, cached: false, status: response.status || 0 };
  } catch (err) {
    const fallback = await cache.match(href);
    if (fallback) return { url: href, ok: true, cached: true, warning: err.message };
    return { url: href, ok: false, error: err.message || String(err) };
  }
}

async function cacheMany(urls, options = {}, port = null) {
  const uniqueUrls = [...new Set((urls || []).filter(Boolean).map(normalizeUrl))];
  const results = [];
  let done = 0;

  for (const href of uniqueUrls) {
    const result = await cacheOne(href, options);
    results.push(result);
    done += 1;
    if (port) {
      port.postMessage({
        type: 'OFFLINE_CACHE_PROGRESS',
        done,
        total: uniqueUrls.length,
        result
      });
    }
  }

  const failed = results.filter(item => !item.ok);
  const summary = { type: 'OFFLINE_CACHE_DONE', total: uniqueUrls.length, ok: results.length - failed.length, failed, results };
  if (port) port.postMessage(summary);
  return summary;
}

async function cacheCoreAssets() {
  const manifest = await readAssetManifest();
  const core = Array.isArray(manifest.core) && manifest.core.length ? manifest.core : FALLBACK_CORE_ASSETS;
  return cacheMany(core, { refresh: false });
}

async function getStatus() {
  const manifest = await readAssetManifest();
  const cache = await caches.open(APP_CACHE);
  const core = Array.isArray(manifest.core) ? manifest.core : FALLBACK_CORE_ASSETS;
  const ocr = Array.isArray(manifest.ocr) ? manifest.ocr : [];

  async function countCached(urls) {
    let cached = 0;
    for (const url of urls) {
      if (await cache.match(normalizeUrl(url))) cached += 1;
    }
    return { total: urls.length, cached };
  }

  const coreStatus = await countCached(core);
  const ocrStatus = await countCached(ocr);
  return {
    type: 'OFFLINE_STATUS',
    version: WEBCODING_SW_VERSION,
    cacheName: APP_CACHE,
    core: coreStatus,
    ocr: ocrStatus
  };
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await cacheCoreAssets();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== APP_CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];

  if (data.type === 'GET_OFFLINE_STATUS') {
    event.waitUntil(getStatus().then(status => port && port.postMessage(status)));
    return;
  }

  if (data.type === 'CACHE_URLS') {
    event.waitUntil(cacheMany(data.urls || [], { refresh: !!data.refresh }, port));
    return;
  }

  if (data.type === 'PREPARE_OFFLINE') {
    event.waitUntil((async () => {
      const manifest = await readAssetManifest();
      const urls = [];
      urls.push(...(Array.isArray(manifest.core) ? manifest.core : FALLBACK_CORE_ASSETS));
      if (data.includeOcr) urls.push(...(Array.isArray(manifest.ocr) ? manifest.ocr : []));
      await cacheMany(urls, { refresh: !!data.refresh }, port);
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const allowedRemote = isCacheableRemote(request.url);
  if (!sameOrigin && !allowedRemote) return;

  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(APP_CACHE);
        await cache.put('index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(request);
        const fallback = await caches.match('index.html') || await caches.match('./');
        return cached || fallback || new Response('WebPad++ is not cached yet. Please reconnect once to prepare offline use.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request) || await caches.match(request.url);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      const cache = await caches.open(APP_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  })());
});
