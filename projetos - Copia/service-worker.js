const CACHE_NAME = 'admin-cache';
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[PWA] Cache aberto com sucesso');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptação de Requisições (Offline Support)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna o cache se encontrar, senão faz a requisição na rede
        if (response) return response;
        return fetch(event.request);
      })
  );
});