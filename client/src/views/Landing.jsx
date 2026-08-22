import Agenda from "../components/Agenda";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import Servicios from "../components/Servicios";
import Barberos from "../components/Barberos";
import { useState, useEffect, useRef, useCallback } from "react";

// Lista de widgets de respaldo en caso de límite alcanzado
const ELFSIGHT_WIDGETS = [
  "b55caa18-3827-43a3-9056-872bfd45e534", // Widget principal
  "db56f908-49b4-4c9c-957a-d30decec426d", // Widget de respaldo
];

const Landing = () => {
  const [horarios, setHorarios] = useState([]);
  const [currentWidgetIndex, setCurrentWidgetIndex] = useState(0);
  // El barbero elegido es el contexto de toda la página: la agenda, los
  // servicios y los precios que se muestran son los suyos.
  const [barberoSeleccionado, setBarberoSeleccionado] = useState(null);
  const [destacarBarberos, setDestacarBarberos] = useState(false);
  const agendarRef = useRef(null);
  const footerRef = useRef(null);
  const barberosRef = useRef(null);

  // Sube al selector y resalta las tarjetas un momento, para que quede claro
  // dónde hay que tocar después del scroll.
  const scrollABarberos = useCallback(() => {
    barberosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setDestacarBarberos(true);
    setTimeout(() => setDestacarBarberos(false), 3000);
  }, []);

  const elegirBarbero = useCallback((barbero) => {
    setBarberoSeleccionado(barbero);
    setDestacarBarberos(false);
    setHorarios([]); // los del barbero anterior ya no aplican
    // Bajar a la agenda: es lo que el cliente quiere ver después de elegir.
    setTimeout(
      () => document.getElementById("agenda")?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  }, []);

  // NO se preselecciona ningún barbero, nunca: ni el último elegido ni el
  // único activo. Que la página cargue con alguien ya seleccionado le da
  // prioridad a ese barbero sobre los demás, y peor todavía, un cliente nuevo
  // podría reservar creyendo que está viendo "la agenda del local" cuando en
  // realidad es la de una persona concreta. La elección se pide de forma
  // explícita, y si intenta agendar sin elegir aparece el modal que se lo
  // recuerda (ver Agenda.jsx).

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

  useEffect(() => {
    // Los turnos ya no se cargan acá: los pide Agenda.jsx cuando hay un
    // barbero elegido, porque dependen de cuál sea.

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
  }, [getUserId, currentWidgetIndex]);

  return (
    <>
      <div className="space-y-6">
        <NavBar agendarRef={agendarRef} footerRef={footerRef} />
        {/* El selector de barbero va PRIMERO: es lo que define qué agenda,
            qué servicios y qué precios ve el cliente más abajo. */}
        <div className="bg-gray-900" ref={barberosRef}>
          <Barberos
            barberoSeleccionado={barberoSeleccionado}
            onSeleccionar={elegirBarbero}
            destacar={destacarBarberos}
          />
        </div>
        <div className="px-2 md:px-4" id="agenda">
          <Agenda
            horarios={horarios}
            setHorarios={setHorarios}
            agendarRef={agendarRef}
            barbero={barberoSeleccionado}
            onElegirBarbero={scrollABarberos}
          />
        </div>
        <div className="bg-black">
          <Servicios barbero={barberoSeleccionado} />
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
