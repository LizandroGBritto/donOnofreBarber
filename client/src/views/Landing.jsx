import Agenda from "../components/Agenda";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import Servicios from "../components/Servicios";
import Barberos from "../components/Barberos";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

// Lista de widgets de respaldo en caso de límite alcanzado
const ELFSIGHT_WIDGETS = [
  "b55caa18-3827-43a3-9056-872bfd45e534", // Widget principal
  "db56f908-49b4-4c9c-957a-d30decec426d", // Widget de respaldo
];

const Landing = () => {
  const [horarios, setHorarios] = useState([]);
  const [currentWidgetIndex, setCurrentWidgetIndex] = useState(0);
  const agendarRef = useRef(null);
  const footerRef = useRef(null);

  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const getUserId = useCallback(() => {
    let userId = localStorage.getItem("userId");
    if (!userId) {
      userId = generateUUID();
      localStorage.setItem("userId", userId);
    }
    return userId;
  }, []);

  // Función para cargar turnos desde la API usando el endpoint de landing filtrado
  const fetchTurnos = useCallback(async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/agenda/landing`
      );
      setHorarios(response.data.agendas || []);
    } catch (error) {
      console.error("Error al obtener turnos en Landing:", error);
      setHorarios([]);
    }
  }, []);

  useEffect(() => {
    // Cargar turnos al montar el componente
    fetchTurnos();

    // Cargar script de Elfsight para Instagram feed
    const script = document.createElement("script");
    script.src = "https://elfsightcdn.com/platform.js";
    script.async = true;

    // Capturar errores de Elfsight
    const originalError = console.error;
    const handleElfsightError = (message, ...args) => {
      if (
        typeof message === "string" &&
        message.includes("APP_VIEWS_LIMIT_REACHED")
      ) {
        console.warn(
          "Elfsight APP_VIEWS_LIMIT_REACHED detectado, intentando con widget de respaldo..."
        );

        // Intentar con el siguiente widget
        if (currentWidgetIndex < ELFSIGHT_WIDGETS.length - 1) {
          setCurrentWidgetIndex(currentWidgetIndex + 1);

          // Reinicializar el script de Elfsight para que cargue el nuevo widget
          if (window.eapps) {
            window.eapps.Platform.go();
          }
        }
      }

      // Llamar al error original
      originalError(message, ...args);
    };

    console.error = handleElfsightError;
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      console.error = originalError;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [getUserId, fetchTurnos, currentWidgetIndex]);

  return (
    <>
      <div className="space-y-6">
        <NavBar agendarRef={agendarRef} footerRef={footerRef} />
        <div className="px-2 md:px-4" id="agenda">
          <Agenda
            horarios={horarios}
            setHorarios={setHorarios}
            getUserId={getUserId}
            agendarRef={agendarRef}
          />
        </div>
        <div className="bg-gray-900">
          <Barberos />
        </div>
        <div className="bg-black">
          <Servicios />
        </div>
        <div className="bg-gray-800 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-white text-center mb-12">
              Mira nuestros últimos cortes
            </h2>
            <div className="flex justify-center">
              {/* Elfsight Instagram Feed | Untitled Instagram Feed */}
              <div
                key={currentWidgetIndex}
                className={`elfsight-app-${ELFSIGHT_WIDGETS[currentWidgetIndex]}`}
                data-elfsight-app-lazy
              ></div>
            </div>
          </div>
        </div>
        <Footer footerRef={footerRef} />
      </div>
    </>
  );
};

export default Landing;
