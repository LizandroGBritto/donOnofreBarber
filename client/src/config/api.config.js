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
      estadisticas: "/api/agenda/dashboard/estadisticas",
    },

    barberos: {
      base: "/api/barberos",
      agenda: "/api/barberos/agenda",
    },

    servicios: {
      base: "/api/servicios",
      admin: "/api/servicios/admin/all",
    },

    horarios: "/api/horarios",
    banners: "/api/banners",
    contacto: "/api/contacto",
    ubicacion: "/api/ubicacion",
    notifications: "/api/notifications",
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
