import axios from "axios";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "flowbite-react";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import FormReservarTurno from "./FormReservarTurno";
import ParaguayDateUtil from "../utils/paraguayDate";

/**
 * Agenda.
 *
 * Con barbero elegido muestra SUS horarios y sus turnos. Sin barbero muestra
 * igual la grilla completa del local (la unión de los horarios de todos), para
 * que el cliente vea la oferta; el barbero se le pide recién al momento de
 * agendar, con un modal.
 */
const Agenda = ({ horarios, setHorarios, agendarRef, barbero, onElegirBarbero }) => {
  const [pedirBarbero, setPedirBarbero] = useState(false);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [openBarberoModal, setOpenBarberoModal] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [userHasReservation, setUserHasReservation] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [diasActivos, setDiasActivos] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  // Usar fechas de Paraguay
  const diaHoy = ParaguayDateUtil.getDayOfWeek();
  // Capitalizar la primera letra para mostrar en el dropdown
  const diaHoyCapitalizado = diaHoy.charAt(0).toUpperCase() + diaHoy.slice(1);

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

  // Cargar información de horarios y semanas
  const loadHorariosYSemanas = useCallback(async () => {
    try {
      // Sin barberoId el servidor devuelve la unión de los horarios de todos
      // los barberos activos, que es la grilla correcta para "todavía no elegí".
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/agenda/horarios-semanas`,
        { params: barbero?._id ? { barberoId: barbero._id } : {} }
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
  }, [diaHoyCapitalizado, barbero?._id]);

  function onCloseModal() {
    setOpenBarberoModal(false);
    setSelectedTurno(null);
  }

  const refreshData = useCallback(() => {
    const numeroCliente = localStorage.getItem("numeroCliente");
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/agenda/landing`, {
        params: {
          // Sin barbero, el endpoint devuelve la vista agregada de siempre:
          // un turno representativo por hora entre todos los barberos.
          ...(barbero?._id ? { barberoId: barbero._id } : {}),
          ...(numeroCliente ? { numero: numeroCliente } : {}),
        },
      })
      .then((res) => {
        setHorarios(res.data.agendas);
        setIsLoading(false);

        const hasReservation = res.data.agendas.some(
          (agenda) => agenda.esMio
        );
        setUserHasReservation(hasReservation);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }, [setHorarios, barbero?._id]);

  // Al cambiar de barbero hay que rehacer todo: la grilla de días, los turnos
  // y la fecha elegida son distintos para cada uno. También corre al montar
  // sin barbero, para traer la vista general.
  useEffect(() => {
    setIsLoading(true);
    setSelectedDate(null);
    setIsInitialLoad(true);

    loadHorariosYSemanas();
    refreshData();
  }, [barbero?._id, loadHorariosYSemanas, refreshData]);

  // Mantener sincronizado el aviso de "ya tenés un turno" con los datos que
  // bajaron (los setea refreshData a través de setHorarios).
  useEffect(() => {
    setUserHasReservation((horarios || []).some((agenda) => agenda.esMio));
  }, [horarios]);

  // ✅ OPTIMIZADO: Usar useMemo para diasDisponibles (evita re-renders)
  const diasDisponibles = useMemo(() => {
    if (!horarios || horarios.length === 0) return [];

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
        const diaNombreIngles = fecha.format("dddd").toLowerCase();
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

    return dias;
  }, [horarios]);

  // ✅ Establecer fecha seleccionada solo una vez cuando diasDisponibles esté listo
  useEffect(() => {
    if (diasDisponibles.length > 0 && !selectedDate) {
      setSelectedDate(diasDisponibles[0].fechaCompleta);
    }
  }, [diasDisponibles, selectedDate]);

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

  // ✅ OPTIMIZADO: Usar useMemo para horariosFiltrados (ANTES del if/return para respetar reglas de Hooks)
  const horariosFiltrados = useMemo(() => {
    const fechaObjetivo = calcularFechaObjetivo();
    if (!fechaObjetivo) return [];

    return horarios
      .filter((agenda) => {
        const fechaAgenda = ParaguayDateUtil.toParaguayTime(agenda.fecha);
        return fechaAgenda.isSame(fechaObjetivo, "day");
      })
      .sort((a, b) => {
        const horaA = parseInt(a.hora.replace(":", ""), 10);
        const horaB = parseInt(b.hora.replace(":", ""), 10);
        return horaA - horaB;
      });
  }, [horarios, selectedDate, calcularFechaObjetivo]);

  if (isLoading) return <h1>Loading...</h1>;

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
            <div className="flex gap-2 md:gap-3 pb-4 lg:justify-center">
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
                  {agenda.esMio ? (
                    <Button
                      disabled={turnoYaPaso(agenda.fecha, agenda.hora)}
                      className={`flex justify-center w-full md:w-auto ${
                        turnoYaPaso(agenda.fecha, agenda.hora)
                          ? "bg-gray-400"
                          : "bg-orange-500"
                      } rounded-lg text-black text-sm md:text-lg items-center px-4 py-2`}
                      onClick={() => {
                        if (!turnoYaPaso(agenda.fecha, agenda.hora)) {
                          navigate(`/editar-turno/${agenda._id}`);
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
                  // Si el usuario ya tiene otro turno reservado, se deshabilita AGENDAR
                  disabled={
                    agenda.estado !== "disponible" ||
                    turnoYaPaso(agenda.fecha, agenda.hora) ||
                    userHasReservation
                  }
                  className={`flex justify-center w-full md:w-auto ${
                    agenda.estado !== "disponible" ||
                    turnoYaPaso(agenda.fecha, agenda.hora)
                      ? "bg-gray-400"
                      : "bg-white"
                  } rounded-lg text-black text-sm md:text-lg items-center px-4 py-2`}
                  onClick={() => {
                    if (
                      agenda.estado !== "disponible" ||
                      turnoYaPaso(agenda.fecha, agenda.hora)
                    ) {
                      return;
                    }

                    // El barbero se pide recién acá: hasta este momento el
                    // cliente pudo mirar horarios y servicios sin elegir nada.
                    if (!barbero) {
                      setPedirBarbero(true);
                      return;
                    }

                    setSelectedTurno({
                      _id: agenda._id,
                      fecha: agenda.fecha,
                      hora: agenda.hora,
                      diaSemana: agenda.diaSemana,
                    });
                    setOpenBarberoModal(true);
                  }}
                >
                  {agenda.estado !== "disponible"
                    ? "RESERVADO"
                    : turnoYaPaso(agenda.fecha, agenda.hora)
                    ? "NO DISPONIBLE"
                    : "AGENDAR"}
                </Button>
              )}

              {/* Modal de reserva. El barbero ya viene elegido de la landing. */}
              {openBarberoModal && selectedTurno && (
                <FormReservarTurno
                  turno={selectedTurno}
                  barbero={barbero}
                  onCloseModal={onCloseModal}
                  refreshData={refreshData}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Aviso cuando se intenta agendar sin haber elegido barbero */}
      {pedirBarbero && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-elegir-barbero"
          onClick={() => setPedirBarbero(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <HiOutlineExclamationCircle
              className="mx-auto mb-3 h-14 w-14 text-purple-500"
              aria-hidden="true"
            />
            <h3
              id="titulo-elegir-barbero"
              className="text-xl font-bold text-gray-900 mb-2"
            >
              ¡Te olvidaste de algo!
            </h3>
            <p className="text-gray-600 mb-6">
              Antes de elegir un horario debés elegir con quién cortarte.
            </p>
            <div className="flex flex-col md:flex-row gap-2 justify-center">
              <button
                onClick={() => {
                  setPedirBarbero(false);
                  onElegirBarbero?.();
                }}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md font-medium hover:from-purple-700 hover:to-blue-700 transition-colors"
              >
                Seleccionar barbero
              </button>
              <button
                onClick={() => setPedirBarbero(false)}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
