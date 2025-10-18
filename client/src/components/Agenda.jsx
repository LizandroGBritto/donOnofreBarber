import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { Button, Modal } from "flowbite-react";
import FormAgendar from "./FormAgendar";
import FormReservarConBarbero from "./FormReservarConBarbero";
import ParaguayDateUtil from "../utils/paraguayDate";

const Agenda = ({ horarios, setHorarios, getUserId, agendarRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [openBarberoModal, setOpenBarberoModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [userHasReservation, setUserHasReservation] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [diasActivos, setDiasActivos] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 🆕 Controlar carga inicial
  const [selectedDate, setSelectedDate] = useState(null); // 🆕 Nueva forma de manejar fecha seleccionada
  const [diasDisponibles, setDiasDisponibles] = useState([]); // 🆕 Array de 15 días disponibles

  // Usar fechas de Paraguay
  const diaHoy = ParaguayDateUtil.getDayOfWeek();
  // Capitalizar la primera letra para mostrar en el dropdown
  const diaHoyCapitalizado = diaHoy.charAt(0).toUpperCase() + diaHoy.slice(1);

  const UserId = getUserId();

  // Función para verificar si un turno ya pasó
  const turnoYaPaso = (fecha, hora) => {
    try {
      const ahora = ParaguayDateUtil.now();
      const fechaTurno = ParaguayDateUtil.toParaguayTime(fecha);

      // Convertir la hora del turno (formato "HH:MM") a minutos
      const [horas, minutos] = hora.split(":").map(Number);
      const fechaTurnoConHora = fechaTurno
        .clone()
        .hour(horas)
        .minute(minutos)
        .second(0);

      // Verificar si el turno ya pasó
      return fechaTurnoConHora.isBefore(ahora);
    } catch (error) {
      console.error("Error verificando si turno ya pasó:", error);
      return false; // En caso de error, permitir agendar
    }
  };

  // Función para verificar si el usuario ya tiene un turno abierto
  const verificarTurnoExistente = useCallback(async (numeroCliente) => {
    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_URL
        }/api/agenda/verificar-turno/${numeroCliente}`
      );
      return response.data; // { tieneTurno: boolean, turno: objeto|null }
    } catch (error) {
      console.error("Error verificando turno existente:", error);
      return { tieneTurno: false, turno: null };
    }
  }, []);

  // Cargar información de horarios y semanas
  const loadHorariosYSemanas = useCallback(async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/agenda/horarios-semanas`
      );
      const data = response.data;

      // Definir el orden correcto de los días
      const ordenDias = [
        "Lunes",
        "Martes",
        "Miercoles",
        "Jueves",
        "Viernes",
        "Sabado",
        "Domingo",
      ];

      // Convertir días activos a formato capitalizado para mostrar
      const diasCapitalizados = data.diasActivos.map(
        (dia) => dia.charAt(0).toUpperCase() + dia.slice(1)
      );

      // Ordenar los días según el orden predefinido
      const diasOrdenados = ordenDias.filter((dia) =>
        diasCapitalizados.includes(dia)
      );

      setDiasActivos(diasOrdenados);
      setSemanas(data.semanas);

      // Establecer semana actual por defecto
      if (data.semanas.length > 0) {
        setSelectedWeek(data.semanas[0]);
      }

      // Establecer día actual si está en los días activos
      if (diasOrdenados.includes(diaHoyCapitalizado)) {
        setSelectedDay(diaHoyCapitalizado);
      } else {
        setSelectedDay(diasOrdenados[0] || null);
      }
    } catch (error) {
      console.error("❌ Error loading horarios y semanas:", error);
      // Fallback a los días de toda la semana en orden correcto
      setDiasActivos([
        "Lunes",
        "Martes",
        "Miercoles",
        "Jueves",
        "Viernes",
        "Sabado",
        "Domingo",
      ]);
      setSelectedDay(diaHoyCapitalizado);
    }
  }, [diaHoyCapitalizado]);

  function onCloseModal() {
    setOpenModal(false);
    setOpenBarberoModal(false);
    setSelectedId(null);
    setSelectedTurno(null);
  }

  const refreshData = useCallback(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/agenda/landing`)
      .then((res) => {
        setHorarios(res.data.agendas);
        setIsLoading(false);

        const hasReservation = res.data.agendas.some(
          (agenda) =>
            agenda.nombreCliente !== "" && agenda.nombreCliente === UserId
        );
        setUserHasReservation(hasReservation);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }, [setHorarios, UserId]);

  // Función para avanzar al siguiente día disponible
  const avanzarAlSiguienteDia = useCallback(() => {
    if (!selectedDay || !selectedWeek || !diasActivos.length) return;

    const ordenDias = [
      "Lunes",
      "Martes",
      "Miercoles",
      "Jueves",
      "Viernes",
      "Sabado",
      "Domingo",
    ];

    const currentDayIndex = ordenDias.indexOf(selectedDay);

    // Buscar el siguiente día activo
    let nextDayIndex = (currentDayIndex + 1) % 7;
    let nextDay = ordenDias[nextDayIndex];

    // Si el siguiente día no está en diasActivos, buscar el próximo día activo
    while (!diasActivos.includes(nextDay) && nextDayIndex !== currentDayIndex) {
      nextDayIndex = (nextDayIndex + 1) % 7;
      nextDay = ordenDias[nextDayIndex];
    }

    // Si el día siguiente está en la misma semana, solo cambiar el día
    if (
      nextDayIndex > currentDayIndex ||
      (currentDayIndex === 6 && nextDayIndex === 0)
    ) {
      setSelectedDay(nextDay);
    } else {
      // Si necesitamos cambiar de semana
      const currentWeekIndex = semanas.findIndex(
        (semana) => semana.label === selectedWeek.label
      );
      if (currentWeekIndex < semanas.length - 1) {
        setSelectedWeek(semanas[currentWeekIndex + 1]);
        setSelectedDay(nextDay);
      }
    }
  }, [selectedDay, selectedWeek, diasActivos, semanas]);

  useEffect(() => {
    // Cargar horarios y semanas al montar el componente
    loadHorariosYSemanas();

    // Si ya se pasaron horarios como props, usarlos directamente
    if (horarios && horarios.length > 0) {
      setIsLoading(false);
      const hasReservation = horarios.some(
        (agenda) =>
          agenda.nombreCliente !== "" && agenda.nombreCliente === UserId
      );
      setUserHasReservation(hasReservation);
    } else if (horarios.length === 0) {
      // Si no hay horarios en props, hacer la llamada a la API (compatibilidad hacia atrás)
      refreshData();
    }
  }, [horarios, UserId, loadHorariosYSemanas, refreshData]);

  // 🆕 Generar los próximos días disponibles (solo los que tienen turnos)
  useEffect(() => {
    const generarDiasDisponibles = () => {
      if (!horarios || horarios.length === 0) return;

      const dias = [];
      const hoy = ParaguayDateUtil.now();

      // Mapeo de días en inglés a español
      const diasEspanol = {
        monday: "Lun",
        tuesday: "Mar",
        wednesday: "Mié",
        thursday: "Jue",
        friday: "Vie",
        saturday: "Sáb",
        sunday: "Dom",
      };

      // Buscar hasta 60 días adelante para encontrar días con turnos
      for (let i = 0; i < 60; i++) {
        const fecha = hoy.clone().add(i, "days");

        // Verificar si este día tiene al menos un turno en la agenda
        const tieneTurnos = horarios.some((agenda) => {
          const fechaAgenda = ParaguayDateUtil.toParaguayTime(agenda.fecha);
          return fechaAgenda.isSame(fecha, "day");
        });

        // Solo agregar el día si tiene turnos
        if (tieneTurnos) {
          const diaNombreIngles = fecha.format("dddd").toLowerCase(); // monday, tuesday, etc.
          const diaCorto = diasEspanol[diaNombreIngles] || fecha.format("ddd");
          const diaNumero = fecha.format("DD");
          const fechaCompleta = fecha.toDate();

          dias.push({
            diaCorto,
            diaNumero,
            fechaCompleta,
            fechaISO: fecha.format("YYYY-MM-DD"),
          });

          // Limitar a 15 días con turnos
          if (dias.length >= 15) break;
        }
      }

      setDiasDisponibles(dias);

      // Establecer el primer día como seleccionado por defecto
      if (dias.length > 0) {
        setSelectedDate(dias[0].fechaCompleta);
      }
    };

    generarDiasDisponibles();
  }, [horarios]);

  // Calcular fecha objetivo basada en la fecha seleccionada
  const calcularFechaObjetivo = useCallback(() => {
    if (!selectedDate) return null;
    return ParaguayDateUtil.toParaguayTime(selectedDate);
  }, [selectedDate]);

  // Efecto para avanzar automáticamente si todos los turnos están ocupados (SOLO EN CARGA INICIAL)
  useEffect(() => {
    // 🆕 Solo ejecutar si es la carga inicial
    if (
      !isLoading &&
      selectedDate &&
      diasDisponibles.length > 0 &&
      horarios.length > 0 &&
      isInitialLoad
    ) {
      // Calcular horarios filtrados dentro del useEffect
      const fechaObjetivo = calcularFechaObjetivo();
      if (fechaObjetivo) {
        const filtrados = horarios
          .filter((agenda) => {
            const fechaAgenda = ParaguayDateUtil.toParaguayTime(agenda.fecha);
            return fechaAgenda.isSame(fechaObjetivo, "day");
          })
          .sort((a, b) => {
            const horaA = parseInt(a.hora.replace(":", ""), 10);
            const horaB = parseInt(b.hora.replace(":", ""), 10);
            return horaA - horaB;
          });

        const todosOcupados =
          filtrados.length > 0 &&
          filtrados.every(
            (agenda) =>
              agenda.estado !== "disponible" ||
              turnoYaPaso(agenda.fecha, agenda.hora)
          );

        if (todosOcupados) {
          // Avanzar al siguiente día disponible
          const fechaActualIndex = diasDisponibles.findIndex((dia) =>
            ParaguayDateUtil.toParaguayTime(dia.fechaCompleta).isSame(
              fechaObjetivo,
              "day"
            )
          );

          if (
            fechaActualIndex >= 0 &&
            fechaActualIndex < diasDisponibles.length - 1
          ) {
            const timer = setTimeout(() => {
              setSelectedDate(
                diasDisponibles[fechaActualIndex + 1].fechaCompleta
              );
              setIsInitialLoad(false);
            }, 100);

            return () => clearTimeout(timer);
          } else {
            setIsInitialLoad(false);
          }
        } else {
          // 🆕 Si hay turnos disponibles, también marcar como no inicial
          setIsInitialLoad(false);
        }
      }
    }
  }, [
    isLoading,
    selectedDate,
    diasDisponibles,
    horarios,
    calcularFechaObjetivo,
    isInitialLoad,
  ]);

  if (isLoading) return <h1>Loading...</h1>;

  // Como el backend ahora devuelve datos limpios (un turno por hora),
  // filtrar por la fecha específica calculada
  const horariosFiltrados = horarios
    .filter((agenda) => {
      const fechaObjetivo = calcularFechaObjetivo();
      if (!fechaObjetivo) {
        return false;
      }

      const fechaAgenda = ParaguayDateUtil.toParaguayTime(agenda.fecha);
      const coincide = fechaAgenda.isSame(fechaObjetivo, "day");

      return coincide;
    })
    .sort((a, b) => {
      const horaA = parseInt(a.hora.replace(":", ""), 10);
      const horaB = parseInt(b.hora.replace(":", ""), 10);
      return horaA - horaB; // Orden Ascendente
    });

  return (
    <div>
      {/* Estilos personalizados para dropdown y mobile fixes */}
      <style>
        {`
          /* Ocultar scrollbar pero mantener funcionalidad */
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          /* Estilos para el carrusel de días */
          .scale-102 {
            transform: scale(1.02);
          }

          .agenda-dropdown [data-testid="flowbite-dropdown"] {
            width: 30% !important;
            min-width: 120px !important;
            text-align: center !important;
          }
          .agenda-dropdown [data-testid="flowbite-dropdown"] > div {
            text-align: center !important;
            justify-content: center !important;
            display: flex !important;
            align-items: center !important;
          }
          .agenda-dropdown [data-testid="flowbite-dropdown"] a {
            text-align: center !important;
            justify-content: center !important;
            display: flex !important;
          }
          
          /* Mobile specific fixes */
          @media (max-width: 768px) {
            .agenda-dropdown [data-testid="flowbite-dropdown"] {
              min-width: 120px !important;
            }
            .agenda-dropdown [data-testid="flowbite-dropdown"] button {
              font-size: 0.75rem !important;
              padding: 0.5rem !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            .agenda-container {
              padding: 0.5rem !important;
              margin: 0.5rem !important;
            }
            .agenda-header {
              flex-direction: column !important;
              gap: 1rem !important;
              align-items: stretch !important;
            }
            .agenda-controls {
              flex-direction: row !important;
              gap: 0.5rem !important;
              justify-content: space-between !important;
            }
            .dropdown-mobile {
              flex: 1 !important;
              min-width: 0 !important;
              display: flex !important;
              justify-content: center;
              align-items: center;
            }
          }
        `}
      </style>

      <div
        className="max-w-full mx-auto bg-black bg-opacity-80 rounded-lg agenda-container p-2 md:p-4 agenda-dropdown"
        ref={agendarRef}
        id="agendar"
      >
        <h3 className="flex justify-center mt-4 md:mt-8 mx-2 md:mx-8 border-b-2 border-gray-300 pb-2">
          AGENDA
        </h3>

        {/* Texto de ayuda para mobile */}
        <p className="md:hidden text-center text-gray-400 text-xs mt-2 mx-2">
          Desliza para ver más días
        </p>

        {/* Carrusel de días */}
        <div className="mx-2 md:mx-8 mt-4 md:mt-8 mb-2">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 md:gap-3 pb-4">
              {diasDisponibles.map((dia, index) => {
                const isSelected =
                  selectedDate &&
                  ParaguayDateUtil.toParaguayTime(selectedDate).isSame(
                    ParaguayDateUtil.toParaguayTime(dia.fechaCompleta),
                    "day"
                  );

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(dia.fechaCompleta)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center rounded-lg p-3 min-w-[70px] md:min-w-[80px] transition-all duration-200 ${
                      isSelected
                        ? "bg-purple-500 text-white scale-105 shadow-lg"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:scale-102"
                    }`}
                  >
                    <span
                      className={`text-xs md:text-sm font-medium ${
                        isSelected ? "text-white" : "text-gray-400"
                      }`}
                    >
                      {dia.diaCorto}
                    </span>
                    <span
                      className={`text-2xl md:text-3xl font-bold mt-1 ${
                        isSelected ? "text-white" : "text-purple-400"
                      }`}
                    >
                      {dia.diaNumero}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-b-2 border-gray-300 mx-2 md:mx-8 pb-2"></div>

        {horariosFiltrados.map((agenda) => {
          return (
            <div
              className="flex flex-col md:flex-row justify-between items-center md:items-start border-b-2 border-gray-300 pb-2 px-2 md:px-4 mt-4 md:mt-8 mx-2 md:mx-8 gap-2 md:gap-0"
              key={agenda._id}
            >
              <h3
                className={`flex justify-center md:justify-start text-xl md:text-lg font-medium ${
                  agenda.estado !== "disponible" ? "line-through" : ""
                }`}
              >
                {agenda.hora}
              </h3>
              {agenda.estado !== "disponible" ? (
                <div className="flex justify-center w-full md:w-auto">
                  {agenda.nombreCliente === UserId ? (
                    <Button
                      disabled={turnoYaPaso(agenda.fecha, agenda.hora)}
                      className={`flex justify-center w-full md:w-auto ${
                        turnoYaPaso(agenda.fecha, agenda.hora)
                          ? "bg-gray-400"
                          : "bg-orange-500"
                      } rounded-lg text-black text-sm md:text-lg items-center px-4 py-2`}
                      onClick={() => {
                        if (!turnoYaPaso(agenda.fecha, agenda.hora)) {
                          setSelectedId(agenda._id);
                          setOpenModal(true);
                        }
                      }}
                    >
                      {turnoYaPaso(agenda.fecha, agenda.hora)
                        ? "EXPIRADO"
                        : "MODIFICAR"}
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="flex justify-center w-full md:w-auto bg-gray-400 rounded-lg text-black text-sm md:text-lg items-center px-4 py-2"
                    >
                      RESERVADO
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  // Si el UserId es "Reservado", el botón cambia a "RESERVADO" y se deshabilita
                  disabled={
                    agenda.estado !== "disponible" ||
                    turnoYaPaso(agenda.fecha, agenda.hora) ||
                    (userHasReservation &&
                      agenda.nombreCliente !== "" &&
                      agenda.nombreCliente !== UserId)
                  }
                  className={`flex justify-center w-full md:w-auto ${
                    agenda.estado !== "disponible" ||
                    turnoYaPaso(agenda.fecha, agenda.hora)
                      ? "bg-gray-400"
                      : "bg-white"
                  } rounded-lg text-black text-sm md:text-lg items-center px-4 py-2`}
                  onClick={() => {
                    // Para turnos disponibles, abrir modal de barberos
                    if (
                      agenda.estado === "disponible" &&
                      !turnoYaPaso(agenda.fecha, agenda.hora)
                    ) {
                      setSelectedTurno({
                        _id: agenda._id,
                        fecha: agenda.fecha,
                        hora: agenda.hora,
                        diaSemana: agenda.diaSemana,
                      });
                      setOpenBarberoModal(true);
                    } else {
                      // Para modificaciones, usar el modal tradicional
                      setSelectedId(agenda._id);
                      setOpenModal(true);
                    }
                  }}
                >
                  {agenda.estado !== "disponible"
                    ? "RESERVADO"
                    : turnoYaPaso(agenda.fecha, agenda.hora)
                    ? "NO DISPONIBLE"
                    : "AGENDAR"}
                </Button>
              )}

              <Modal
                className="flex justify-center items-center bg-black bg-opacity-50 p-4 md:p-0"
                show={openModal}
                size="lg"
                onClose={onCloseModal}
                popup
                position="center"
              >
                <Modal.Header />
                <Modal.Body>
                  <div className="space-y-6">
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                      Datos para la reserva
                    </h3>
                    <div className="AgendarForm">
                      <FormAgendar
                        id={selectedId}
                        onCloseModal={onCloseModal}
                        refreshData={refreshData}
                        getUserId={getUserId}
                      />
                    </div>
                  </div>
                </Modal.Body>
              </Modal>

              {/* Modal para reservas con barberos */}
              {openBarberoModal && selectedTurno && (
                <FormReservarConBarbero
                  turno={selectedTurno}
                  onCloseModal={onCloseModal}
                  refreshData={refreshData}
                  getUserId={getUserId}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Agenda;
