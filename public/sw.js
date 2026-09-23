/*
 * Service worker de Old Brads.
 *
 * Hace lo mínimo y a propósito: guarda el armazón de la app para que abra
 * al toque y muestre algo aunque la cancha no tenga señal. Los datos NUNCA
 * se cachean — una carta, una nómina o una votación vieja serían peores que
 * un error, así que todo lo que va a Supabase pasa derecho a la red.
 */
const CACHE = 'old-brads-v1'
const ARMAZON = ['/', '/jugadores', '/app/icono-192.png', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARMAZON)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Datos y API: siempre de la red. Nada de cartas ni votaciones viejas.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Navegación: red primero, y si no hay señal, el armazón guardado.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/jugadores').then((r) => r || caches.match('/'))))
    return
  }

  // Estáticos con hash en el nombre: del cache si está, y se guarda al vuelo.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/app/'))) {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copia))
        }
        return res
      }),
    ),
  )
})
