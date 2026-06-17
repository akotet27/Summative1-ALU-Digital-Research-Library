/* sw.js — Service Worker: offline-first caching for Ethiolab */
'use strict';

var CACHE = 'ethiolab-v1';

var STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './dashboard.html',
  './admin.html',
  './styles/main.css',
  './scripts/storage.js',
  './scripts/auth.js',
  './scripts/validators.js',
  './scripts/search.js',
  './scripts/app.js',
  './scripts/dashboard.js',
  './scripts/admin.js',
];

/* ── Install: pre-cache all static assets ─────────────────────── */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── Activate: delete outdated caches ────────────────────────── */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ── Fetch: strategy by resource type ───────────────────────── */
self.addEventListener('fetch', function (e) {
  var req = e.request;

  /* Skip non-GET and cross-origin chrome-extension requests */
  if (req.method !== 'GET') return;
  if (req.url.startsWith('chrome-extension://')) return;

  var url = new URL(req.url);

  /* ── HTML navigation: network-first, fall back to cache ────── */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then(function (res) {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* ── Static assets (CSS/JS/fonts): cache-first ─────────────── */
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;

      return fetch(req).then(function (res) {
        /* Only cache successful same-origin or CORS responses */
        if (res.ok && (url.origin === self.location.origin || res.type === 'cors')) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () {
        /* Offline fallback for JS/CSS: return empty valid response */
        if (url.pathname.endsWith('.css')) {
          return new Response('', { headers: { 'Content-Type': 'text/css' } });
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
