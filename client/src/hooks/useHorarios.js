import { useState, useCallback } from "react";
import axios from "axios";
const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

export const useHorarios = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHorarios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/horarios`);
      return response.data.horarios;
    } catch (err) {
      setError(err.response?.data?.message || "Error al obtener horarios");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getHorarioPorDia = useCallback(async (dia) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/horarios/dia/${dia}`);
      return response.data.horario;
    } catch (err) {
      setError(err.response?.data?.message || "Error al obtener horario");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSlotsDisponibles = useCallback(async (fecha) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${API_BASE}/horarios/slots?fecha=${fecha}`
      );
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Error al obtener slots");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const crearOActualizarHorario = useCallback(async (horarioData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_BASE}/horarios`, horarioData);
      return response.data.horario;
    } catch (err) {
      setError(
        err.response?.data?.message || "Error al crear/actualizar horario"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleDia = useCallback(async (diaSemana) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.patch(
        `${API_BASE}/horarios/${diaSemana}/toggle`
      );
      return response.data.horario;
    } catch (err) {
      setError(
        err.response?.data?.message || "Error al cambiar estado del día"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getHorarios,
    getHorarioPorDia,
    getSlotsDisponibles,
    crearOActualizarHorario,
    toggleDia,
  };
};
