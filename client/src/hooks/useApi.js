import axios from "axios";
import config from "../config/api.config";

// Configurar axios con base URL
const api = axios.create({
  baseURL: config.api.base,
  withCredentials: true,
});

// Interceptor para logging en desarrollo
if (config.isDevelopment()) {
  api.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      console.error("API Request Error:", error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      console.error("API Response Error:", error);
      return Promise.reject(error);
    }
  );
}

// Hook personalizado para API calls
export const useApi = () => {
  return {
    // Auth
    auth: {
      login: (credentials) => api.post(config.api.auth.login, credentials),
      logout: () => api.post(config.api.auth.logout),
      register: (userData) => api.post(config.api.auth.register, userData),
    },

    // Users
    users: {
      getAll: () => api.get(config.api.user.list).then((res) => res.data),
      getById: (id) =>
        api.get(config.api.user.byId(id)).then((res) => res.data),
      update: (id, userData) =>
        api.put(config.api.user.byId(id), userData).then((res) => res.data),
      delete: (id) =>
        api.delete(config.api.user.byId(id)).then((res) => res.data),
    },

    // Agenda
    agenda: {
      getAll: () =>
        api
          .get(config.api.agenda.base)
          .then((res) => res.data.agendas || res.data),
      getById: (id) =>
        api.get(config.api.agenda.byId(id)).then((res) => res.data),
      update: (id, data) =>
        api.put(config.api.agenda.byId(id), data).then((res) => res.data),
      delete: (id) =>
        api.delete(config.api.agenda.byId(id)).then((res) => res.data),
      regenerar: () =>
        api.post("/api/agenda/regenerar-por-horarios").then((res) => res.data),
      verificarTurno: (numero) =>
        api
          .get(config.api.agenda.verificarTurno(numero))
          .then((res) => res.data),
      reservarConBarbero: (data) =>
        api
          .post(config.api.agenda.reservarConBarbero, data)
          .then((res) => res.data),
      getLanding: () =>
        api.get(config.api.agenda.landing).then((res) => res.data),
      getHorariosYSemanas: () =>
        api.get(config.api.agenda.horariosYSemanas).then((res) => res.data),
      getDisponibilidad: (fecha) =>
        api
          .get(`${config.api.agenda.disponibilidad}/${fecha}`)
          .then((res) => res.data),
      getDisponibilidadBarberos: (fecha) =>
        api
          .get(config.api.agenda.disponibilidadBarberos(fecha))
          .then((res) => res.data),
      getEstadisticas: () =>
        api.get(config.api.agenda.estadisticas).then((res) => res.data),
    },

    // Barberos
    barberos: {
      getAll: () => api.get(config.api.barberos.base).then((res) => res.data),
      getAgenda: () =>
        api.get(config.api.barberos.agenda).then((res) => res.data),
      create: (formData) =>
        api.post(config.api.barberos.base, formData).then((res) => res.data),
      update: (id, formData) =>
        api
          .put(`${config.api.barberos.base}/${id}`, formData)
          .then((res) => res.data),
      delete: (id) =>
        api.delete(`${config.api.barberos.base}/${id}`).then((res) => res.data),
      toggle: (id) =>
        api
          .patch(`${config.api.barberos.base}/${id}/estado`)
          .then((res) => res.data),
    },

    // Servicios
    servicios: {
      getAll: () => api.get(config.api.servicios.admin).then((res) => res.data),
      create: (formData) =>
        api.post(config.api.servicios.base, formData).then((res) => res.data),
      update: (id, formData) =>
        api
          .put(`${config.api.servicios.base}/${id}`, formData)
          .then((res) => res.data),
      delete: (id) =>
        api
          .delete(`${config.api.servicios.base}/${id}`)
          .then((res) => res.data),
      toggle: (id) =>
        api
          .patch(`${config.api.servicios.base}/${id}/toggle`)
          .then((res) => res.data),
    },

    // Banners
    banners: {
      getAll: (filters) =>
        api
          .get(config.api.banners, { params: filters })
          .then((res) => res.data),
      create: (formData) =>
        api.post(config.api.banners, formData).then((res) => res.data),
      update: (id, formData) =>
        api
          .put(`${config.api.banners}/${id}`, formData)
          .then((res) => res.data),
      delete: (id) =>
        api.delete(`${config.api.banners}/${id}`).then((res) => res.data),
      toggle: (id, estado) =>
        api
          .patch(`${config.api.banners}/${id}/estado`, { estado })
          .then((res) => res.data),
    },

    // Contacto
    contacto: {
      get: () => api.get(config.api.contacto).then((res) => res.data.contacto),
      create: (data) =>
        api.post(config.api.contacto, data).then((res) => res.data),
      update: (id, data) =>
        api.put(`${config.api.contacto}/${id}`, data).then((res) => res.data),
    },

    // Ubicación
    ubicacion: {
      get: () =>
        api.get(config.api.ubicacion).then((res) => res.data.ubicacion),
      create: (data) =>
        api.post(config.api.ubicacion, data).then((res) => res.data),
      update: (id, data) =>
        api.put(`${config.api.ubicacion}/${id}`, data).then((res) => res.data),
    },

    // Horarios
    horarios: {
      getAll: () =>
        api
          .get(config.api.horarios)
          .then((res) => res.data.horarios || res.data),
      create: (data) =>
        api.post(config.api.horarios, data).then((res) => res.data),
      update: (id, data) =>
        api.put(`${config.api.horarios}/${id}`, data).then((res) => res.data),
      delete: (id) =>
        api.delete(`${config.api.horarios}/${id}`).then((res) => res.data),
      toggle: (id) =>
        api
          .patch(`${config.api.horarios}/${id}/estado`)
          .then((res) => res.data),
    },

    // Notificaciones
    notifications: {
      getAll: () => api.get(config.api.notifications).then((res) => res.data),
    },

    // API instance para casos especiales
    api,
  };
};

export default api;
