// Service Worker para manejar notificaciones push y funcionalidad PWA
const CACHE_NAME = "alonso-style-v1";
const urlsToCache = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

// Instalar service worker
self.addEventListener("install", (event) => {
  console.log("Service Worker: Instalado");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Cacheando archivos");
        return cache.addAll(
          urlsToCache.filter(
            (url) => url !== "/icon-192.png" && url !== "/icon-512.png"
          )
        );
      })
      .catch((error) => {
        console.log("Error al cachear:", error);
      })
  );

  self.skipWaiting();
});

// Activar service worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activado");
  event.waitUntil(self.clients.claim());
});

// Manejar notificaciones push
self.addEventListener("push", (event) => {
  console.log("Push recibido:", event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Nueva notificación", body: event.data.text() };
    }
  }

  const title = data.title || "Don Onofre Barbería";
  const options = {
    body: data.body || "Nueva notificación disponible",
    icon: data.icon || "/AlonzoStylev2.webp",
    badge: data.badge || "/AlonzoStylev2.webp",
    image: data.image,
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || "general",
    renotify: true,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Manejar clics en notificaciones
self.addEventListener("notificationclick", (event) => {
  console.log("Notificación clickeada:", event);

  event.notification.close();

  const { action, data } = event;
  const url = data?.url || "/admin";

  if (action === "close") {
    return;
  }

  // Abrir o enfocar la ventana de la aplicación
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Buscar si ya hay una ventana abierta
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            // Si hay una ventana abierta, enfocarla y navegar a la URL
            client.focus();
            client.postMessage({
              type: "NAVIGATE",
              url: url,
              notificationData: data,
            });
            return;
          }
        }

        // Si no hay ventana abierta, abrir una nueva
        return self.clients.openWindow(self.location.origin + url);
      })
  );
});

// Manejar cierre de notificaciones
self.addEventListener("notificationclose", (event) => {
  console.log("Notificación cerrada:", event);

  // Aquí podrías enviar analytics sobre notificaciones cerradas
  const data = event.notification.data;
  if (data?.analytics) {
    // Enviar datos de analytics
  }
});

// Manejar mensajes del cliente
self.addEventListener("message", (event) => {
  console.log("Mensaje recibido en SW:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Manejo básico de fetch (opcional, para funcionalidad offline)
self.addEventListener("fetch", (event) => {
  // Solo interceptar requests específicos si es necesario
  if (event.request.url.includes("/api/notifications")) {
    // Podrías agregar lógica de cache aquí si lo necesitas
  }
});
