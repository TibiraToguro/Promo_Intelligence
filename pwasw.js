const CACHE = 'promotor-app-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './assets/logo-jet.svg',
  './js/state.js',
  './js/config.js',
  './js/api.js',
  './js/ui.js',
  './js/auth.js',
  './js/slot.js',
  './js/router.js'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});

self.addEventListener('fetch', (evt) => {
  evt.respondWith(caches.match(evt.request).then((hit) => hit || fetch(evt.request)));
});
