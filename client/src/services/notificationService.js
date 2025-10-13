class NotificationService {
  constructor() {
    // Detectar iOS
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // Para iOS, verificar versión mínima (iOS 16.4+)
    this.isIOSSupported = this.isIOS ? this.checkIOSVersion() : true;

    // Verificación de soporte base
    this.hasServiceWorker = "serviceWorker" in navigator;
    this.hasPushManager = "PushManager" in window;
    this.hasNotification = "Notification" in window;

    // Soporte completo considerando iOS
    this.isSupported =
      this.hasServiceWorker &&
      this.hasPushManager &&
      this.hasNotification &&
      this.isIOSSupported;

    this.permission = this.hasNotification ? Notification.permission : "denied";
    this.subscription = null;
    this.vapidPublicKey = null;
  }

  // Verificar versión de iOS
  checkIOSVersion() {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      // iOS 16.4+ soporta Web Push
      return major > 16 || (major === 16 && minor >= 4);
    }
    // Si no podemos detectar la versión, asumir que sí soporta
    return true;
  }

  // Verificar si las notificaciones están soportadas
  isNotificationSupported() {
    // Para iOS, verificar si las notificaciones están realmente disponibles
    if (this.isIOS) {
      // Verificar si la API está disponible después de habilitar las funciones experimentales
      const hasNotificationAPI = 'Notification' in window;
      const hasPushManager = 'PushManager' in window;
      const hasServiceWorker = 'serviceWorker' in navigator;
      
      return hasNotificationAPI && hasPushManager && hasServiceWorker && this.isIOSSupported;
    }
    
    return this.isSupported;
  }

  // Obtener información detallada de soporte
  getSupportInfo() {
    const notificationPermission = 'Notification' in window ? Notification.permission : 'no disponible';
    
    return {
      isSupported: this.isSupported,
      isIOS: this.isIOS,
      isSafari: this.isSafari,
      isIOSSupported: this.isIOSSupported,
      hasServiceWorker: this.hasServiceWorker,
      hasPushManager: this.hasPushManager,
      hasNotification: this.hasNotification,
      notificationPermission,
      userAgent: navigator.userAgent,
      isStandalone: window.navigator.standalone || false,
      // Información adicional para iOS
      iosVersion: this.isIOS ? this.getIOSVersion() : null,
      // Estado actual de soporte real
      realSupport: this.isNotificationSupported(),
    };
  }

  // Obtener versión específica de iOS
  getIOSVersion() {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
    if (match) {
      return `${match[1]}.${match[2]}`;
    }
    return 'desconocida';
  }

  // Obtener el estado actual de permisos
  getPermissionStatus() {
    return this.isSupported && "Notification" in window
      ? Notification.permission
      : "denied";
  }

  // Registrar service worker
  async registerServiceWorker() {
    if (!this.isSupported) {
      throw new Error(
        "Las notificaciones push no están soportadas en este navegador"
      );
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registrado:", registration);

      // Esperar a que esté activo
      await this.waitForServiceWorker(registration);

      return registration;
    } catch (error) {
      console.error("Error al registrar Service Worker:", error);
      throw error;
    }
  }

  // Esperar a que el service worker esté activo
  async waitForServiceWorker(registration) {
    return new Promise((resolve) => {
      if (registration.active) {
        resolve(registration);
        return;
      }

      const worker = registration.installing || registration.waiting;
      if (worker) {
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            resolve(registration);
          }
        });
      } else {
        resolve(registration);
      }
    });
  }

  // Obtener clave pública VAPID del servidor
  async getVapidPublicKey() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/vapid-public-key`
      );
      const data = await response.json();
      this.vapidPublicKey = data.publicKey;
      return data.publicKey;
    } catch (error) {
      console.error("Error al obtener clave VAPID:", error);
      throw error;
    }
  }

  // Solicitar permisos de notificación
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error("Las notificaciones no están soportadas");
    }

    if (!("Notification" in window)) {
      throw new Error(
        "Las notificaciones no están disponibles en este navegador"
      );
    }

    if (this.permission === "granted") {
      return "granted";
    }

    if (this.permission === "denied") {
      throw new Error("Los permisos de notificación fueron denegados");
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;

    if (permission !== "granted") {
      throw new Error("Permisos de notificación no concedidos");
    }

    return permission;
  }

  // Suscribirse a notificaciones push
  async subscribe(userId = "admin") {
    try {
      // Registrar service worker
      const registration = await this.registerServiceWorker();

      // Solicitar permisos
      await this.requestPermission();

      // Obtener clave VAPID
      if (!this.vapidPublicKey) {
        await this.getVapidPublicKey();
      }

      // Crear suscripción
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });

      this.subscription = subscription;

      // Enviar suscripción al servidor
      await this.sendSubscriptionToServer(subscription, userId);

      console.log("Suscripción exitosa:", subscription);
      return subscription;
    } catch (error) {
      console.error("Error al suscribirse:", error);
      throw error;
    }
  }

  // Enviar suscripción al servidor
  async sendSubscriptionToServer(subscription, userId) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription: subscription,
            userId: userId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log("Suscripción enviada al servidor:", result);
      return result;
    } catch (error) {
      console.error("Error al enviar suscripción al servidor:", error);
      throw error;
    }
  }

  // Desuscribirse de notificaciones
  async unsubscribe() {
    try {
      if (!this.subscription) {
        const registration = await navigator.serviceWorker.ready;
        this.subscription = await registration.pushManager.getSubscription();
      }

      if (this.subscription) {
        await this.subscription.unsubscribe();

        // Notificar al servidor
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/notifications/unsubscribe`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              endpoint: this.subscription.endpoint,
            }),
          }
        );

        this.subscription = null;
        console.log("Desuscripción exitosa");
      }
    } catch (error) {
      console.error("Error al desuscribirse:", error);
      throw error;
    }
  }

  // Obtener suscripción actual
  async getCurrentSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
      return this.subscription;
    } catch (error) {
      console.error("Error al obtener suscripción actual:", error);
      return null;
    }
  }

  // Verificar si está suscrito
  async isSubscribed() {
    const subscription = await this.getCurrentSubscription();
    return !!subscription;
  }

  // Enviar notificación de prueba
  async sendTestNotification() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log("Notificación de prueba enviada:", result);
      return result;
    } catch (error) {
      console.error("Error al enviar notificación de prueba:", error);
      throw error;
    }
  }

  // Convertir clave VAPID base64 a Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Escuchar mensajes del service worker
  setupMessageListener() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        const { type, url, notificationData } = event.data;

        if (type === "NAVIGATE" && url) {
          // Navegar a la URL especificada
          window.location.href = url;
        }
      });
    }
  }
}

// Crear instancia singleton
const notificationService = new NotificationService();

export default notificationService;
