import { useState, useEffect } from "react";
import axios from "axios";
import Location from "../assets/Location on.svg";
import Maps from "../assets/Google Maps Old.svg";
import Whatsapp from "../assets/Whatsapp.svg";
import Instagram from "../assets/Instagram.svg";

const Footer = ({ footerRef }) => {
  const [contacto, setContacto] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);

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
      <div
        ref={footerRef}
        className="rounded-lg mx-4 mb-4 p-6 backdrop-blur-sm"
        style={{ backgroundColor: "#290740" }}
      >
        <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 ">
          <div className="flex-1 max-w-sm text-center bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6  border border-white border-opacity-20 min-h-[200px] flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b-2 border-white border-opacity-50">
                UBICACION
              </h3>
            </div>
            <div className="flex-1 flex flex-col justify-center pl-5">
              <div className="flex justify-start items-center mb-3">
                <img src={Location} alt="Location" className="mr-2" />
                <p className="text-white font-medium">
                  {ubicacion?.direccion || "Asunción - Paraguay"}
                </p>
              </div>
              <div className="flex justify-start items-center">
                <a
                  className="flex items-center hover:text-purple-600 transition-colors duration-200"
                  href={ubicacion?.enlaceMaps || "https://g.co/kgs/6UKZTmH"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={Maps} alt="Location" className="mr-2" />
                  <p className="text-orange-500 hover:text-orange-600 text-sm">
                    Toca Aquí para ver en Google Maps
                  </p>
                </a>
              </div>
            </div>
          </div>
          <div className="flex-1 max-w-sm text-center bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 border border-white border-opacity-20 min-h-[200px] flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b-2 border-white border-opacity-50">
                CONTACTO
              </h3>
            </div>
            <div className="flex-1 flex flex-col justify-center pl-5">
              <div className="flex justify-start items-center mb-4">
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
                  className="flex items-center hover:text-green-600 transition-colors duration-200"
                >
                  <img src={Whatsapp} alt="Whatsapp" className="mr-2" />
                  <p className="text-white font-medium">
                    {contacto?.whatsapp || "+595 994 622 020"}
                  </p>
                </a>
              </div>

              <div className="flex justify-start items-center mb-4">
                <a
                  className="flex items-center hover:text-purple-600 transition-colors duration-200"
                  href={
                    contacto?.instagramUrl ||
                    (contacto?.instagram
                      ? `https://www.instagram.com/${contacto.instagram.replace(
                          "@",
                          ""
                        )}`
                      : "https://www.instagram.com/acapuedo/?hl=es")
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={Instagram} alt="Instagram" className="mr-2" />
                  <p className="text-white font-medium">
                    {contacto?.instagram || "@acapuedo"}
                  </p>
                </a>
              </div>

              {/* Email section */}
              <div className="flex justify-start items-center">
                <a
                  href={`mailto:${
                    contacto?.correo || "contacto@alonzostyle.com"
                  }`}
                  className="flex items-center hover:text-blue-400 transition-colors duration-200"
                >
                  <svg
                    className="w-6 h-6 mr-2 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                  </svg>
                  <p className="text-white font-medium text-sm">
                    {contacto?.correo || "contacto@alonzostyle.com"}
                  </p>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-black bg-opacity-20 rounded-lg p-2 mt-4">
          <h6 className="text-white text-center text-xs font-medium">
            © 2024 Alonzo Style. Todos los derechos reservados.
          </h6>
        </div>
      </div>
    </>
  );
};

export default Footer;
