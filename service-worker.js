const CACHE = 'kimse-pwa-20260917-release38-contrastfix1';
const CORE = [
  './',
  './index.html',
  './app.css',
  './capture-polish.css',
  './accessibility-enhancements.css',
  './app.js',
  './accessibility-enhancements.js',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable-source.svg'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE).then(c => c.put(event.request, copy));
    return resp;
  }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html'))));
});