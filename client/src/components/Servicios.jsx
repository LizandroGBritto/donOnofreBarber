import React, { useState, useEffect, useCallback, memo } from "react";
import axios from "axios";

const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchServicios();
  }, []);

  const fetchServicios = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/servicios`
      );
      // La API ya devuelve solo servicios activos
      setServicios(response.data || []);
    } catch (error) {
      console.error("Error al obtener servicios:", error);
      setError("Error al cargar los servicios");
    } finally {
      setLoading(false);
    }
  };

  const scrollToAgenda = useCallback(() => {
    const agendaSection = document.getElementById("agenda");
    if (agendaSection) {
      agendaSection.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // ✅ Memoizar CarruselImagenes para evitar re-renders innecesarios
  const CarruselImagenes = memo(({ imagenes, nombre }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const nextImage = useCallback((e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsPaused(true);
      setCurrentImageIndex((prevIndex) =>
        prevIndex === imagenes.length - 1 ? 0 : prevIndex + 1
      );
      // Resume auto-advance after 3 seconds
      setTimeout(() => setIsPaused(false), 3000);
    }, [imagenes.length]);

    const prevImage = useCallback((e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsPaused(true);
      setCurrentImageIndex((prevIndex) =>
        prevIndex === 0 ? imagenes.length - 1 : prevIndex - 1
      );
      // Resume auto-advance after 3 seconds
      setTimeout(() => setIsPaused(false), 3000);
    }, [imagenes.length]);

    const goToImage = useCallback((e, index) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsPaused(true);
      setCurrentImageIndex(index);
      // Resume auto-advance after 3 seconds
      setTimeout(() => setIsPaused(false), 3000);
    }, []);

    // Reset index if it's out of bounds
    useEffect(() => {
      if (currentImageIndex >= imagenes.length) {
        setCurrentImageIndex(0);
      }
    }, [imagenes.length, currentImageIndex]);

    // Auto-advance carousel every 5 seconds if there are multiple images and not paused
    useEffect(() => {
      if (imagenes.length > 1 && !isPaused) {
        const interval = setInterval(() => {
          setCurrentImageIndex((prevIndex) =>
            prevIndex === imagenes.length - 1 ? 0 : prevIndex + 1
          );
        }, 5000);

        return () => clearInterval(interval);
      }
    }, [imagenes.length, isPaused]);

    if (!imagenes || imagenes.length === 0) {
      return (
        <div className="w-full h-48 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-lg font-semibold">{nombre}</span>
        </div>
      );
    }

    return (
      <div
        className="relative w-full h-48 rounded-lg overflow-hidden group"
        id="servicios"
      >
        <img
          src={`${import.meta.env.VITE_API_URL}/uploads/${
            imagenes[currentImageIndex]
          }`}
          alt={`${nombre} - ${currentImageIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        {imagenes.length > 1 && (
          <>
            {/* Botón anterior */}
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-70 z-10"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Botón siguiente */}
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-70 z-10"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Indicadores */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {imagenes.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => goToImage(e, index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex
                      ? "bg-white"
                      : "bg-white bg-opacity-50 hover:bg-opacity-75"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Overlay de gradiente para mejor legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-20"></div>
      </div>
    );
  }); // ✅ Cierre correcto de memo()

  if (loading) {
    return (
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Nuestros Servicios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse"
              >
                <div className="w-full h-48 bg-gray-300"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded mb-4"></div>
                  <div className="h-6 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Nuestros Servicios
          </h2>
          <p className="text-red-400">{error}</p>
        </div>
      </section>
    );
  }

  if (servicios.length === 0) {
    return (
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Nuestros Servicios
          </h2>
          <p className="text-gray-300">
            No hay servicios disponibles en este momento.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-white mb-4">
          Nuestros Servicios
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
          Descubre nuestros servicios de barbería profesional. Cada servicio
          está diseñado para brindarte la mejor experiencia en cuidado personal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servicios.map((servicio) => (
            <div
              key={servicio._id}
              className="bg-gray-900 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 group border border-gray-800"
            >
              {/* Carrusel de imágenes */}
              <CarruselImagenes
                imagenes={servicio.imagenes}
                nombre={servicio.nombre}
              />

              {/* Contenido de la tarjeta */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors duration-200">
                  {servicio.nombre}
                </h3>

                {servicio.descripcion && (
                  <p className="text-gray-300 mb-4 line-clamp-3">
                    {servicio.descripcion}
                  </p>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-purple-600">
                    Gs. {servicio.precio.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={scrollToAgenda}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transform transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Reservar Turno
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action adicional */}
        <div className="text-center mt-12">
          <p className="text-gray-300 mb-4">¿Listo para tu próximo corte?</p>
          <button
            onClick={scrollToAgenda}
            className="bg-transparent border-2 border-purple-400 text-purple-400 py-3 px-8 rounded-lg font-medium hover:bg-purple-400 hover:text-black transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Ver Agenda Completa
          </button>
        </div>
      </div>
    </section>
  );
};

export default Servicios;
