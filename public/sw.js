// sw.js (Service Worker)
const CACHE_NAME = 'mannen-clock-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/months/01_mutsuki.svg',
  '/months/02_kisaragi.svg',
  '/months/03_yayoi.svg',
  '/months/04_uzuki.svg',
  '/months/05_satsuki.svg',
  '/months/06_minazuki.svg',
  '/months/07_fumizuki.svg',
  '/months/08_hazuki.svg',
  '/months/09_nagatsuki.svg',
  '/months/10_kannazuki.svg',
  '/months/11_shimotsuki.svg',
  '/months/12_shiwasu.svg',
  '/sounds/chime1.opus',
  '/sounds/chime2.opus',
];

// インストール時に全部まとめてキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// フェッチ時はキャッシュ優先、なければネットワーク
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    )
  );
});