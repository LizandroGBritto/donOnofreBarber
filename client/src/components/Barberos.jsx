import { useState, useEffect, useCallback } from "react";
import axios from "axios";

/**
 * Selector de barbero. Es el punto de entrada de la landing: todo lo que viene
 * después (agenda, servicios, precios) corresponde al barbero elegido acá.
 *
 * `barberoSeleccionado` / `onSeleccionar` los controla Landing.jsx, que es
 * quien mantiene el estado y lo persiste.
 */
const Barberos = ({
  barberoSeleccionado,
  onSeleccionar,
  // Se pone en true cuando el cliente intentó agendar sin haber elegido:
  // las tarjetas se resaltan un momento para que se note dónde hay que tocar.
  destacar = false,
}) => {
  const [barberos, setBarberos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBarberos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBarberos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/barberos/activos`
      );
      setBarberos(response.data);
    } catch (error) {
      console.error("Error al obtener barberos:", error);
      setError("Error al cargar los barberos");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Memoizar funciones de navegación
  const scrollToAgenda = useCallback(() => {
    const agendaSection = document.getElementById("agenda");
    if (agendaSection) {
      agendaSection.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const scrollToServicios = useCallback(() => {
    const serviciosSection = document.getElementById("servicios");
    if (serviciosSection) {
      serviciosSection.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Nuestros Barberos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse"
              >
                <div className="w-full h-64 bg-gray-700"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded mb-4"></div>
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
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Nuestros Barberos
          </h2>
          <p className="text-red-400">{error}</p>
        </div>
      </section>
    );
  }

  if (barberos.length === 0) {
    return (
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Nuestros Barberos
          </h2>
          <p className="text-gray-300">Información de barberos próximamente.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-900">
      <div className="container mx-auto px-4">
        {/* Animación de resalte: se dispara cuando alguien intenta agendar
            sin haber elegido barbero. */}
        <style>{`
          @keyframes latidoBarbero {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168,85,247,0); }
            50%      { transform: scale(1.03); box-shadow: 0 0 0 10px rgba(168,85,247,0.25); }
          }
          .barbero-destacado {
            animation: latidoBarbero 0.9s ease-in-out 3;
            border-color: rgb(168 85 247) !important;
          }
          @media (prefers-reduced-motion: reduce) {
            .barbero-destacado { animation: none; box-shadow: 0 0 0 6px rgba(168,85,247,0.35); }
          }
        `}</style>

        <h2 className="text-3xl font-bold text-center text-white mb-4">
          Seleccioná tu barbero preferido
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
          Conocé a nuestro equipo y elegí con quién querés atenderte.
        </p>

        <div
          className="flex flex-wrap justify-center gap-8"
          role="radiogroup"
          aria-label="Seleccionar barbero"
        >
          {barberos.map((barbero) => {
            const seleccionado = barberoSeleccionado?._id === barbero._id;

            return (
            <div
              key={barbero._id}
              role="radio"
              tabIndex={0}
              aria-checked={seleccionado}
              aria-label={barbero.nombre}
              onClick={() => onSeleccionar?.(barbero)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeleccionar?.(barbero);
                }
              }}
              className={`relative bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300 group w-96 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                seleccionado
                  ? "border-2 border-purple-500 ring-2 ring-purple-500/40 shadow-xl"
                  : "border border-gray-700 hover:shadow-xl hover:border-gray-500"
              } ${destacar && !seleccionado ? "barbero-destacado" : ""}`}
            >
              {/* Imagen del barbero */}
              <div className="relative overflow-hidden">
                <img
                  src={`${import.meta.env.VITE_API_URL}/uploads/${
                    barbero.foto
                  }`}
                  alt={barbero.nombre}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  decoding="async"
                />

                {/* Logo del barbero (si existe) */}
                {barbero.logo && (
                  <div className="absolute top-4 right-4 bg-[rgb(172_148_250)] rounded-full p-2">
                    <img
                      src={`${import.meta.env.VITE_API_URL}/uploads/${
                        barbero.logo
                      }`}
                      alt={`Logo de ${barbero.nombre}`}
                      className="w-12 h-12 object-contain rounded-full"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}

                {/* Overlay con gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
              </div>

              {/* Contenido de la tarjeta */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <h3
                    className={`text-xl font-bold transition-colors duration-200 ${
                      seleccionado
                        ? "text-purple-300"
                        : "text-white group-hover:text-purple-400"
                    }`}
                  >
                    {barbero.nombre}
                  </h3>
                  {seleccionado && (
                    <span className="flex-shrink-0 bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      ✓ Seleccionado
                    </span>
                  )}
                </div>

                <p className="text-gray-300 text-sm leading-relaxed">
                  {barbero.descripcion}
                </p>

                {!seleccionado && (
                  <p className="text-purple-400 text-sm font-medium mt-4">
                    Tocá para ver su agenda y sus precios →
                  </p>
                )}
              </div>

              {/* Efectos visuales */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 transform transition-transform duration-300 ${
                  seleccionado ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                }`}
              ></div>
            </div>
            );
          })}
        </div>

        {/* Call to action — solo tiene sentido con un barbero ya elegido */}
        {barberoSeleccionado && (
          <div className="text-center mt-12">
            <p className="text-gray-300 mb-4">
              Estás viendo la agenda y los precios de{" "}
              <span className="text-purple-300 font-semibold">
                {barberoSeleccionado.nombre}
              </span>
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={scrollToAgenda}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium transition duration-300 ease-in-out transform hover:from-purple-700 hover:to-blue-700 hover:scale-105"
              >
                Reservar Turno
              </button>
              <button
                onClick={scrollToServicios}
                className="bg-transparent border-2 border-purple-400 text-purple-400 py-3 px-6 rounded-lg font-medium transition duration-300 ease-in-out transform hover:bg-purple-400 hover:text-gray-900 hover:scale-105"
              >
                Ver Servicios
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Barberos;
