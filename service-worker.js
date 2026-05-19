const CACHE_NAME = 'admin-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/script.js',
  '/js/particles.js',
  '/manifest.json'
];

// Instalação e Cache Inicial
self.addEventListener('install', event => {
  self.skipWaiting(); // Força o novo cache assumir imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[PWA] Cache aberto com sucesso');
        return cache.addAll(urlsToCache);
      })
  );
});

// Limpeza de Caches Antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
});

// Interceptação de Requisições (Network First - Sempre busca o mais atualizado)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        return networkResponse;
      })
      .catch(() => caches.match(event.request)) // Só usa o cache se ficar sem internet
  );
});