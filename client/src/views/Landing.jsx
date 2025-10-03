import Agenda from "../components/Agenda";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import Servicios from "../components/Servicios";
import Barberos from "../components/Barberos";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const Landing = () => {
  const [horarios, setHorarios] = useState([]);
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

  // Función para cargar turnos desde la API (igual que en AdminDashboard)
  const fetchTurnos = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/agenda");
      console.log("Turnos obtenidos en Landing:", response.data.agendas);
      setHorarios(response.data.agendas || []);
    } catch (error) {
      console.error("Error al obtener turnos en Landing:", error);
      setHorarios([]);
    }
  }, []);

  useEffect(() => {
    const userId = getUserId();
    console.log("User ID:", userId);

    // Cargar turnos al montar el componente
    fetchTurnos();

    // Cargar script de Elfsight para Instagram feed
    const script = document.createElement("script");
    script.src = "https://elfsightcdn.com/platform.js";
    script.async = true;
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [getUserId, fetchTurnos]);

  return (
    <>
      <div className="space-y-6">
        <NavBar agendarRef={agendarRef} footerRef={footerRef} />
        <div className="px-4" id="agenda">
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
                className="elfsight-app-db56f908-49b4-4c9c-957a-d30decec426d"
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
