import React, { useState, useEffect } from "react";
import axios from "axios";

const Barberos = () => {
  const [barberos, setBarberos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBarberos();
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

  const scrollToAgenda = () => {
    const agendaSection = document.getElementById("agenda");
    if (agendaSection) {
      agendaSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToServicios = () => {
    const serviciosSection = document.getElementById("servicios");
    if (serviciosSection) {
      serviciosSection.scrollIntoView({ behavior: "smooth" });
    }
  };

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
        <h2 className="text-3xl font-bold text-center text-white mb-4">
          Nuestros Barberos
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
          Conoce a nuestro equipo de barberos profesionales, cada uno con su
          estilo único y años de experiencia en el arte de la barbería.
        </p>

        <div className="flex flex-wrap justify-center gap-8">
          {barberos.map((barbero) => (
            <div
              key={barbero._id}
              className="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group border border-gray-700 w-96"
            >
              {/* Imagen del barbero */}
              <div className="relative overflow-hidden">
                <img
                  src={`${import.meta.env.VITE_API_URL}/uploads/${
                    barbero.foto
                  }`}
                  alt={barbero.nombre}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
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
                    />
                  </div>
                )}

                {/* Overlay con gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
              </div>

              {/* Contenido de la tarjeta */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors duration-200">
                  {barbero.nombre}
                </h3>

                <p className="text-gray-300 text-sm leading-relaxed">
                  {barbero.descripcion}
                </p>
              </div>

              {/* Efectos visuales */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center mt-12">
          <p className="text-gray-300 mb-4">
            ¿Quieres conocer más sobre nuestros barberos?
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
      </div>
    </section>
  );
};

export default Barberos;
