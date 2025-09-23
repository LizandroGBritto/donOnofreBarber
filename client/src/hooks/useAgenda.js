import { useState, useCallback } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";

export const useAgenda = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Obtener turnos con filtros
  const getTurnos = useCallback(async (filtros = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (filtros.fecha) params.append("fecha", filtros.fecha);
      if (filtros.fechaInicio)
        params.append("fechaInicio", filtros.fechaInicio);
      if (filtros.fechaFin) params.append("fechaFin", filtros.fechaFin);
      if (filtros.estado) params.append("estado", filtros.estado);
      if (filtros.diaSemana) params.append("diaSemana", filtros.diaSemana);
      if (filtros.cliente) params.append("cliente", filtros.cliente);
      if (filtros.page) params.append("page", filtros.page);
      if (filtros.limit) params.append("limit", filtros.limit);

      const response = await axios.get(`${API_BASE}/agenda?${params}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Error al obtener turnos");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reservar turno
  const reservarTurno = useCallback(async (turnoData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_BASE}/agenda/new`, turnoData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Error al reservar turno");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar estado del turno
  const actualizarEstadoTurno = useCallback(
    async (turnoId, estado, estadoPago = null) => {
      try {
        setLoading(true);
        setError(null);

        const data = { estado };
        if (estadoPago) data.estadoPago = estadoPago;

        const response = await axios.put(`${API_BASE}/agenda/${turnoId}`, data);
        return response.data;
      } catch (err) {
        setError(err.response?.data?.message || "Error al actualizar turno");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Cancelar/liberar turno
  const liberarTurno = useCallback(async (turnoId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.delete(`${API_BASE}/agenda/${turnoId}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Error al liberar turno");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener turnos disponibles para una fecha
  const getTurnosDisponibles = useCallback(async (fecha) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_BASE}/agenda/disponibles?fecha=${fecha}`
      );
      return response.data;
    } catch (err) {
      setError(
        err.response?.data?.message || "Error al obtener turnos disponibles"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener estadísticas
  const getEstadisticas = useCallback(async (año = null) => {
    try {
      setLoading(true);
      setError(null);

      const params = año ? `?año=${año}` : "";
      const response = await axios.get(
        `${API_BASE}/agenda/dashboard/estadisticas${params}`
      );
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Error al obtener estadísticas");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generar turnos
  const generarTurnos = useCallback(async (opciones) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${API_BASE}/agenda/generar-turnos`,
        opciones
      );
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Error al generar turnos");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getTurnos,
    reservarTurno,
    actualizarEstadoTurno,
    liberarTurno,
    getTurnosDisponibles,
    getEstadisticas,
    generarTurnos,
  };
};

export default useAgenda;
