// OPD System Progressive Web App (PWA) Service Worker
const CACHE_NAME = 'opd-pwa-cache-v2';
const STATIC_ASSETS = [
    '/favicon.png',
    '/favicon.ico',
    '/manifest.json',
    '/images/LOGO-04.jpg',
];

// Install Event - Pre-cache essential static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean up outdated caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Network First with Cache Fallback for static assets
self.addEventListener('fetch', (event) => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') return;

    // Skip non-http(s) requests or Inertia API requests
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;

    // For static images & fonts: Stale-While-Revalidate
    if (
        url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/) ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com')
    ) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchedResponse = fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => cachedResponse);

                    return cachedResponse || fetchedResponse;
                });
            })
        );
        return;
    }

    // For all other pages: Network First with fallback
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

// Push Event - Receive push notification payload
self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: '🏥 มีผู้ป่วยส่งตัวมาใหม่', body: event.data.text() };
        }
    }

    const title = data.title || '🏥 มีผู้ป่วยส่งตัวมาใหม่';
    const targetUrl = data.url || '/';
    const options = {
        body: data.body || 'มีรายการผู้ป่วยส่งตัวใหม่เข้ามาในระบบ',
        icon: data.icon || '/images/LOGO-04.jpg',
        badge: '/images/LOGO-04.jpg',
        tag: data.tag || 'opd-patient-alert',
        data: { url: targetUrl },
        vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event - Navigate directly to the patient's record page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    let targetUrl = '/';
    if (event.notification.data) {
        if (typeof event.notification.data === 'string') {
            targetUrl = event.notification.data;
        } else if (typeof event.notification.data === 'object' && event.notification.data.url) {
            targetUrl = event.notification.data.url;
        }
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already an open window from this origin
            for (let client of windowClients) {
                if (client.url && 'navigate' in client && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // If no window is currently open, open a new window directly to the patient URL
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
