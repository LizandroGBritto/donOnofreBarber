import Agenda from "../components/Agenda";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
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
  }, [getUserId, fetchTurnos]);

  return (
    <>
      <div className="space-y-6">
        <NavBar agendarRef={agendarRef} footerRef={footerRef} />
        <div className="px-4">
          <Agenda
            horarios={horarios}
            setHorarios={setHorarios}
            getUserId={getUserId}
            agendarRef={agendarRef}
          />
        </div>
        <Footer footerRef={footerRef} />
      </div>
    </>
  );
};

export default Landing;
