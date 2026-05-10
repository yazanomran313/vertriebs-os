const CACHE_NAME = 'sunday-review-v1'
const STATIC = ['/', '/review', '/history', '/icon-192.png']

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

// Sunday reminder — called from the app after login
self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_SUNDAY_REMINDER') {
    const { hasDoneReview } = event.data
    const now = new Date()
    const isSunday = now.getDay() === 0
    const hour = now.getHours()
    if (isSunday && !hasDoneReview && hour >= 9 && hour < 20) {
      self.registration.showNotification('🧠 Sunday Review', {
        body: 'Wie kann ich mit weniger Zeit mehr Geld verdienen? — Jetzt reflektieren!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'sunday-review',
        renotify: true,
        data: { url: '/review' },
      }).catch(() => {})
    }
  }
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); existing.navigate(url) }
      else clients.openWindow(url)
    })
  )
})
