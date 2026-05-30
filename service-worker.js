const CACHE = 'wt-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/base.css',
  '/css/components.css',
  '/js/db.js',
  '/js/app.js',
  '/js/utils/timer.js',
  '/js/utils/calculator.js',
  '/js/utils/backup.js',
  '/js/views/dashboard.js',
  '/js/views/workout-active.js',
  '/js/views/history.js',
  '/js/views/progress.js',
  '/js/views/exercises.js',
  '/js/views/settings.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('unpkg.com') || e.request.url.includes('jsdelivr.net')) {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const cached = await c.match(e.request);
        if (cached) return cached;
        const res = await fetch(e.request);
        c.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});