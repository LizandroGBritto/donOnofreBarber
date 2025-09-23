import { useState, useCallback } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000/api";

export const useServicios = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getServicios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/servicios`);
      return response.data.servicios;
    } catch (err) {
      setError(err.response?.data?.message || "Error al obtener servicios");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getServiciosByCategoria = useCallback(async (categoria) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${API_BASE}/servicios/categoria/${categoria}`
      );
      return response.data.servicios;
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error al obtener servicios por categoría"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const crearServicio = useCallback(async (servicioData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_BASE}/servicios`, servicioData);
      return response.data.servicio;
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear servicio");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarServicio = useCallback(async (id, servicioData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.put(
        `${API_BASE}/servicios/${id}`,
        servicioData
      );
      return response.data.servicio;
    } catch (err) {
      setError(err.response?.data?.message || "Error al actualizar servicio");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleServicio = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.patch(`${API_BASE}/servicios/${id}/toggle`);
      return response.data.servicio;
    } catch (err) {
      setError(
        err.response?.data?.message || "Error al cambiar estado del servicio"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getServicios,
    getServiciosByCategoria,
    crearServicio,
    actualizarServicio,
    toggleServicio,
  };
};
