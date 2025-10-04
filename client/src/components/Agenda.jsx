import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Dropdown } from "flowbite-react";
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

  // Usar fechas de Paraguay
  const diaHoy = ParaguayDateUtil.getDayOfWeek();
  // Capitalizar la primera letra para mostrar en el dropdown
  const diaHoyCapitalizado = diaHoy.charAt(0).toUpperCase() + diaHoy.slice(1);

  const UserId = getUserId();

  // Cargar información de horarios y semanas
  const loadHorariosYSemanas = useCallback(async () => {
    console.log("🔄 Cargando horarios y semanas...");
    try {
      const response = await axios.get(
        "http://localhost:8000/api/agenda/horarios-semanas"
      );
      const data = response.data;
      console.log("📥 Respuesta del servidor:", data);

      // Convertir días activos a formato capitalizado para mostrar
      const diasCapitalizados = data.diasActivos.map(
        (dia) => dia.charAt(0).toUpperCase() + dia.slice(1)
      );

      console.log("📅 Días activos:", diasCapitalizados);
      console.log("📆 Semanas:", data.semanas);

      setDiasActivos(diasCapitalizados);
      setSemanas(data.semanas);

      // Establecer semana actual por defecto
      if (data.semanas.length > 0) {
        setSelectedWeek(data.semanas[0]);
        console.log("✅ Semana seleccionada por defecto:", data.semanas[0]);
      }

      // Establecer día actual si está en los días activos
      if (diasCapitalizados.includes(diaHoyCapitalizado)) {
        setSelectedDay(diaHoyCapitalizado);
        console.log("✅ Día seleccionado (hoy):", diaHoyCapitalizado);
      } else {
        setSelectedDay(diasCapitalizados[0] || null);
        console.log(
          "✅ Día seleccionado (primer disponible):",
          diasCapitalizados[0] || null
        );
      }
    } catch (error) {
      console.error("❌ Error loading horarios y semanas:", error);
      // Fallback a los días de toda la semana
      setDiasActivos([
        "Lunes",
        "Martes",
        "Miercoles",
        "Jueves",
        "Viernes",
        "Sabado",
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
      .get("http://localhost:8000/api/agenda/landing")
      .then((res) => {
        console.log("📅 TURNOS LANDING (LIMPIOS):", res.data.agendas);
        console.log("📊 Total de turnos mostrados:", res.data.agendas.length);
        console.log("ℹ️ Mensaje:", res.data.mensaje);
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

  if (isLoading) return <h1>Loading...</h1>;

  // Calcular fecha objetivo basada en la semana y día seleccionados
  const calcularFechaObjetivo = () => {
    if (!selectedWeek || !selectedDay) return null;

    // Encontrar qué día de la semana es el día seleccionado
    // IMPORTANTE: Este array debe coincidir con cómo el backend calcula las semanas
    // El backend establece inicioSemana al LUNES, por lo que el array debe empezar desde Lunes
    const diasSemana = [
      "Lunes",
      "Martes",
      "Miercoles",
      "Jueves",
      "Viernes",
      "Sabado",
      "Domingo",
    ];
    const diaIndex = diasSemana.indexOf(selectedDay);

    if (diaIndex === -1) return null;

    // Calcular la fecha específica en la semana seleccionada
    const inicioSemana = ParaguayDateUtil.toParaguayTime(
      selectedWeek.inicioSemana
    );
    const fechaObjetivo = inicioSemana.add(diaIndex, "days");

    console.log(`🎯 Calculando fecha objetivo:`);
    console.log(`   - Día seleccionado: ${selectedDay} (índice: ${diaIndex})`);
    console.log(
      `   - Inicio semana: ${inicioSemana.format("YYYY-MM-DD dddd")}`
    );
    console.log(
      `   - Fecha objetivo: ${fechaObjetivo.format("YYYY-MM-DD dddd")}`
    );

    return fechaObjetivo;
  };

  // Como el backend ahora devuelve datos limpios (un turno por hora),
  // filtrar por la fecha específica calculada
  const horariosFiltrados = horarios
    .filter((agenda) => {
      const fechaObjetivo = calcularFechaObjetivo();
      if (!fechaObjetivo) {
        console.log("❌ No hay fecha objetivo calculada");
        return false;
      }

      const fechaAgenda = ParaguayDateUtil.toParaguayTime(agenda.fecha);
      const coincide = fechaAgenda.isSame(fechaObjetivo, "day");

      if (coincide) {
        console.log(
          `✅ Turno coincide: ${agenda.hora} - ${fechaAgenda.format(
            "YYYY-MM-DD"
          )} === ${fechaObjetivo.format("YYYY-MM-DD")}`
        );
      }

      return coincide;
    })
    .sort((a, b) => {
      const horaA = parseInt(a.hora.replace(":", ""), 10);
      const horaB = parseInt(b.hora.replace(":", ""), 10);
      return horaA - horaB; // Orden Ascendente
    });

  console.log(
    `📊 Horarios filtrados para mostrar: ${horariosFiltrados.length}`
  );
  console.log("📋 Datos del filtro:");
  console.log("- Selected Week:", selectedWeek);
  console.log("- Selected Day:", selectedDay);
  console.log(
    "- Fecha objetivo:",
    calcularFechaObjetivo()?.format("YYYY-MM-DD")
  );
  console.log("- Total horarios disponibles:", horarios.length);

  return (
    <div>
      {/* Estilos personalizados para dropdown */}
      <style>
        {`
          .agenda-dropdown [data-testid="flowbite-dropdown"] {
            width: 20% !important;
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
        `}
      </style>

      <div
        className="max-w-11/12 mx-auto bg-black bg-opacity-80 rounded-lg p-4 agenda-dropdown"
        ref={agendarRef}
        id="agendar"
      >
        <h3 className="flex justify-center mt-8 ml-8 mr-8 border-b-2 border-gray-300 pb-2">
          AGENDA
        </h3>

        {/* Selectores de Semana y Día */}
        <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-gray-300 ml-8 mr-8 pb-4 pt-4 gap-4">
          <h3 className="justify-start mt-2 ml-3 hidden md:flex">HORA</h3>

          <div className="flex flex-row gap-3 px-4 md:px-0 w-full md:w-auto justify-center md:justify-end">
            {/* Select de Semana */}
            <div className="w-36 md:w-auto min-w-0">
              <Dropdown
                color=""
                label={selectedWeek ? selectedWeek.label : "Seleccionar Semana"}
                dismissOnClick={true}
                className="w-full [&>button]:text-center [&>button]:justify-center [&>button]:text-xs [&>button]:px-2"
              >
                {semanas.map((semana, index) => (
                  <Dropdown.Item
                    key={index}
                    onClick={() => {
                      setSelectedWeek(semana);
                    }}
                  >
                    {semana.label}
                  </Dropdown.Item>
                ))}
              </Dropdown>
            </div>

            {/* Select de Día */}
            <div className="w-24 md:w-auto min-w-0">
              <Dropdown
                color=""
                label={`${selectedDay || "Día"}`}
                dismissOnClick={true}
                className="w-full [&>button]:text-center [&>button]:justify-center [&>button]:text-xs [&>button]:px-2"
              >
                {diasActivos.map((dia, index) => (
                  <Dropdown.Item
                    key={index}
                    onClick={() => {
                      setSelectedDay(dia);
                    }}
                    style={{ width: "20%" }}
                  >
                    {dia}
                  </Dropdown.Item>
                ))}
              </Dropdown>
            </div>
          </div>
        </div>

        {horariosFiltrados.map((agenda) => {
          return (
            <div
              className="flex justify-between border-b-2 border-gray-300 pb-2 pl-4 mt-8 ml-8 mr-8"
              key={agenda._id}
            >
              <h3
                className={`flex justify-start ${
                  agenda.estado !== "disponible" ? "line-through" : ""
                }`}
              >
                {agenda.hora}
              </h3>
              {agenda.estado !== "disponible" ? (
                <h3 className="flex justify-center mr-4 text-[#FF7D00]">
                  {agenda.nombreCliente === UserId ? (
                    <Button
                      className="flex justify-center bg-orange-500 rounded-lg text-black text-lg items-center"
                      onClick={() => {
                        setSelectedId(agenda._id);
                        setOpenModal(true);
                      }}
                    >
                      MODIFICAR
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="flex justify-center bg-gray-400 rounded-lg text-black text-lg items-center"
                    >
                      RESERVADO
                    </Button>
                  )}
                </h3>
              ) : (
                <Button
                  // Si el UserId es "Reservado", el botón cambia a "RESERVADO" y se deshabilita
                  disabled={
                    agenda.estado !== "disponible" ||
                    (userHasReservation &&
                      agenda.nombreCliente !== "" &&
                      agenda.nombreCliente !== UserId)
                  }
                  className={`flex justify-center mr-6 ${
                    agenda.estado !== "disponible" ? "bg-gray-400" : "bg-white"
                  } rounded-lg text-black text-lg items-center`}
                  onClick={() => {
                    // Para turnos disponibles, abrir modal de barberos
                    if (agenda.estado === "disponible") {
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
                  {agenda.estado !== "disponible" ? "RESERVADO" : "AGENDAR"}
                </Button>
              )}

              <Modal
                className="flex justify-center items-center bg-black bg-opacity-15"
                show={openModal}
                size="sm"
                onClose={onCloseModal}
                popup
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
