import { useState, useEffect } from "react";
import axios from "axios";
import Location from "../assets/Location on.svg";
import Maps from "../assets/Google Maps Old.svg";
import Whatsapp from "../assets/Whatsapp.svg";
import Instagram from "../assets/Instagram.svg";

const Footer = ({ footerRef }) => {
  const [contacto, setContacto] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);

  // Detectar si estamos en el panel de administración
  const isAdminPanel = window.location.pathname.includes("/admin");

  useEffect(() => {
    const fetchContactoUbicacion = async () => {
      try {
        // Obtener información de contacto
        const contactoResponse = await axios.get(
          "http://localhost:8000/api/contacto"
        );
        if (contactoResponse.data.contacto) {
          setContacto(contactoResponse.data.contacto);
        }

        // Obtener información de ubicación
        const ubicacionResponse = await axios.get(
          "http://localhost:8000/api/ubicacion"
        );
        if (ubicacionResponse.data.ubicacion) {
          setUbicacion(ubicacionResponse.data.ubicacion);
        }
      } catch (error) {
        console.error(
          "Error al obtener información de contacto/ubicación:",
          error
        );
      }
    };

    fetchContactoUbicacion();
  }, []);
  return (
    <>
      <footer
        ref={footerRef}
        className="bg-gradient-to-b from-gray-900 to-black border-t border-gray-700"
      >
        <div className="container mx-auto px-6 py-12">
          {/* Main content - Una sola card unificada - Solo mostrar si no es panel admin */}
          {!isAdminPanel && (
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl p-8 border border-gray-600 hover:border-purple-500 transition-all duration-300 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Ubicación */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <svg
                      className="w-6 h-6 mr-3 text-purple-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    UBICACIÓN
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <img
                        src={Location}
                        alt="Location"
                        className="w-5 h-5 mt-1 filter brightness-0 invert"
                      />
                      <p className="text-gray-300 leading-relaxed">
                        {ubicacion?.direccion || "Asunción - Paraguay"}
                      </p>
                    </div>

                    <a
                      href={ubicacion?.enlaceMaps || "https://g.co/kgs/6UKZTmH"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105"
                    >
                      <img
                        src={Maps}
                        alt="Maps"
                        className="w-4 h-4 filter brightness-0 invert"
                      />
                      <span className="text-sm font-medium">
                        Ver en Google Maps
                      </span>
                    </a>
                  </div>
                </div>

                {/* Contacto */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <svg
                      className="w-6 h-6 mr-3 text-purple-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                    </svg>
                    CONTACTO
                  </h3>

                  <div className="space-y-4">
                    <a
                      href={
                        contacto?.whatsapp
                          ? `https://wa.me/${contacto.whatsapp.replace(
                              /[^\d]/g,
                              ""
                            )}`
                          : "https://wa.me/595994622020"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 text-gray-300 hover:text-green-400 transition-colors duration-300 group"
                    >
                      <img
                        src={Whatsapp}
                        alt="Whatsapp"
                        className="w-5 h-5 group-hover:scale-110 transition-transform duration-300"
                      />
                      <span className="font-medium">
                        {contacto?.whatsapp || "+595 994 622 020"}
                      </span>
                    </a>

                    <a
                      href={
                        contacto?.instagramUrl ||
                        (contacto?.instagram
                          ? `https://www.instagram.com/${contacto.instagram.replace(
                              "@",
                              ""
                            )}`
                          : "https://www.instagram.com/alonzo_style/")
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 text-gray-300 hover:text-pink-400 transition-colors duration-300 group"
                    >
                      <img
                        src={Instagram}
                        alt="Instagram"
                        className="w-5 h-5 group-hover:scale-110 transition-transform duration-300"
                      />
                      <span className="font-medium">
                        {contacto?.instagram || "@alonzo_style"}
                      </span>
                    </a>

                    <a
                      href={`mailto:${
                        contacto?.correo || "contacto@alonzostyle.com"
                      }`}
                      className="flex items-center space-x-3 text-gray-300 hover:text-blue-400 transition-colors duration-300 group"
                    >
                      <svg
                        className="w-5 h-5 group-hover:scale-110 transition-transform duration-300"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                      </svg>
                      <span className="font-medium text-sm">
                        {contacto?.correo || "contacto@alonzostyle.com"}
                      </span>
                    </a>
                  </div>
                </div>

                {/* Horarios */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <svg
                      className="w-6 h-6 mr-3 text-purple-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    HORARIOS
                  </h3>

                  <div className="space-y-3 text-gray-300">
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="font-medium">Lunes - Viernes</span>
                      <span className="text-purple-400">8:00 - 19:00</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="font-medium">Sábados</span>
                      <span className="text-purple-400">8:00 - 17:00</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium">Domingos</span>
                      <span className="text-red-400">Cerrado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom section */}
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-center md:text-left">
                <h4 className="text-xl font-bold text-white mb-2">
                  Alonzo Style
                </h4>
                <p className="text-gray-400 text-sm">
                  Tu estilo, nuestra pasión
                </p>
              </div>

              <div className="text-center md:text-right">
                <p className="text-gray-400 text-sm">
                  © 2025 Alonzo Style. Todos los derechos reservados.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Diseñado con ❤️ para la mejor experiencia
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
