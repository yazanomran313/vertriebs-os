// Vertriebs-OS Service Worker
const CACHE_NAME = 'vertriebs-os-v1'
const STATIC = ['/', '/dashboard', '/icon-192.png']

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC).catch(() => {}))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
    ])
  )
})

// Network-first strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone)).catch(() => {})
        return res
      })
      .catch(() => caches.match(event.request))
  )
})

// Local reminder check — called from the app
self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_TTV_REMINDER') {
    const { hasSessionToday } = event.data
    const hour = new Date().getHours()
    if (!hasSessionToday && hour >= 9 && hour < 20) {
      self.registration.showNotification('📞 Vertriebs-OS', {
        body: 'Du hast heute noch kein TTV gestartet — jetzt loslegen!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'ttv-reminder',
        renotify: true,
        data: { url: '/dashboard/ttv' },
      }).catch(() => {})
    }
  }
})

// Push notification from server (future server-side cron)
self.addEventListener('push', event => {
  const data = event.data?.json?.() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || '📞 Vertriebs-OS', {
      body: data.body || 'Hast du heute schon dein TTV gestartet?',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'ttv',
      data: { url: data.url || '/dashboard/ttv' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); existing.navigate(url) }
      else clients.openWindow(url)
    })
  )
})
