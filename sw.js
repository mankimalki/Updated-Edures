const CACHE_NAME = 'eduresources-v1';
const DYNAMIC_CACHE_NAME = 'eduresources-dynamic-v1';
const MAX_DYNAMIC_CACHE_ITEMS = 50;

const ASSETS_TO_CACHE = [
  '/', 
  'index.html', 
  'syllabus.html', 
  'about.html', 
  'books.html', 
  'fallback.html',
  'notes.html',
  'pastpapers.html',
  'privacy.html',
  'quizzes.html',
  'quiz.html',
  'resources.html',
  'tutoring.html',
  'tips.html',
  'syllabus-data.json', 
  'papers-data.json', 
  'icon-192.png', 
  'icon-512.png',
  'logo.png', 
  'hero-bg.jpg',
  'manifest.json',
  'service-worker.js',
  'assets/fonts/roboto.woff2',
  'assets/images/banner.jpg',
];

// Limit dynamic cache size
const limitCacheSize = (name, maxItems) => {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => limitCacheSize(name, maxItems));
      }
    });
  });
};

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE_NAME) {
            console.log('SW: Removing old cache', cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;

  if (event.request.url.endsWith('.html')) {
    event.respondWith(
      caches.match(event.request).then((cachedRes) => {
        return cachedRes || fetch(event.request).catch(() => caches.match('fallback.html'));
      })
    );
  }

  else if (event.request.url.endsWith('.jpg') || event.request.url.endsWith('.png') || event.request.url.endsWith('.woff2') || event.request.url.endsWith('.css') || event.request.url.endsWith('.js')) {
    event.respondWith(
      caches.match(event.request).then((cachedRes) => {
        return cachedRes || fetch(event.request).then((fetchRes) => {
          return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchRes.clone());
            limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_ITEMS);
            return fetchRes;
          });
        });
      })
    );
  }

  else if (event.request.url.endsWith('syllabus-data.json') || event.request.url.endsWith('papers-data.json')) {
    event.respondWith(
      caches.match(event.request).then((cachedRes) => {
        const fetchRes = fetch(event.request).then((response) => {
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_ITEMS);
          });
          return response;
        });
        return cachedRes || fetchRes;
      }).catch(() => caches.match('fallback.html'))
    );
  }

  else {
    event.respondWith(
      caches.match(event.request).then((cachedRes) => {
        return cachedRes || fetch(event.request).catch(() => caches.match('fallback.html'));
      })
    );
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-resources') {
    console.log('SW: Background sync triggered');
    // Placeholder for retry logic
  }
});

// Push notification
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'EduResources', body: 'You have a new notification!', url: '/' };

  const options = {
    body: data.body,
    icon: 'icon-192.png',
    badge: 'badge.png',
    vibrate: [200, 100, 200],
    data: { url: data.url },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});