// =================================
// CONFIGURACIÓN DEL FRONTEND
// =================================

const config = {
  // URL del API backend
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",

  // Environment
  environment: import.meta.env.VITE_NODE_ENV || "development",

  // Helper para construir URLs de API
  api: {
    base: import.meta.env.VITE_API_URL || "http://localhost:8000",

    // Endpoints principales
    auth: {
      login: "/api/auth/login",
      logout: "/api/auth/logout",
      register: "/api/auth/register",
    },

    user: {
      base: "/api/user",
      list: "/api/user/",
      byId: (id) => `/api/user/${id}`,
      // Quién es el usuario de la sesión, según el servidor. El panel se
      // hidrata de acá en vez de confiar en lo guardado en el navegador.
      me: "/api/user/me",
    },

    agenda: {
      base: "/api/agenda",
      verificarTurno: (numero) => `/api/agenda/verificar-turno/${numero}`,
      byId: (id) => `/api/agenda/${id}`,
      deleteAndCreate: (id) => `/api/agenda/delete-and-create/${id}`,
      reservarConBarbero: "/api/agenda/reservar-con-barbero",
      landing: "/api/agenda/landing",
      horariosYSemanas: "/api/agenda/horarios-semanas",
      disponibilidad: "/api/agenda/disponibilidad",
      disponibilidadBarberos: (fecha) =>
        `/api/agenda/disponibilidad-barberos/${fecha}`,
      metricas: "/api/agenda/dashboard/metricas",
      editarMiTurno: (id) => `/api/agenda/editar-mi-turno/${id}`,
      liberarMiTurno: (id) => `/api/agenda/liberar-mi-turno/${id}`,
      generarToken: (id) => `/api/agenda/${id}/generar-token`,
      recordatorioPush: (id) => `/api/agenda/${id}/recordatorio-push`,
    },

    barberos: {
      base: "/api/barberos",
      agenda: "/api/barberos/agenda",
      // Públicas, las consume la landing.
      activos: "/api/barberos/activos",
      servicios: (id) => `/api/barberos/${id}/servicios`,
      // Fotos propias de un barbero para un servicio del catálogo.
      imagenesServicio: (id, servicioId) =>
        `/api/barberos/${id}/servicios/${servicioId}/imagenes`,
      imagenServicio: (id, servicioId, imagen) =>
        `/api/barberos/${id}/servicios/${servicioId}/imagenes/${encodeURIComponent(
          imagen
        )}`,
    },

    servicios: {
      base: "/api/servicios",
      admin: "/api/servicios/admin/all",
    },

    horarios: "/api/horarios",
    banners: "/api/banners",
    contacto: "/api/contacto",
    ubicacion: "/api/ubicacion",
    instagram: "/api/instagram",
    notifications: "/api/notifications",
    vapidPublicKey: "/api/notifications/vapid-public-key",
  },

  // Helper function para crear URL completa
  getApiUrl: (endpoint) => {
    const base = config.api.base;
    return `${base}${endpoint}`;
  },

  // Helper function para uploads
  getUploadUrl: (filename) => {
    return `${config.api.base}/uploads/${filename}`;
  },

  // Verificar si estamos en producción
  isProduction: () => config.environment === "production",

  // Verificar si estamos en desarrollo
  isDevelopment: () => config.environment === "development",
};

export default config;
