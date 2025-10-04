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
  const [selectedDay, setSelectedDay] = useState(null); // Estado para el día seleccionado

  const diasSemana = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
  ];

  // Usar fechas de Paraguay
  const hoy = ParaguayDateUtil.now();
  const diaHoy = ParaguayDateUtil.getDayOfWeek();
  // Capitalizar la primera letra para mostrar en el dropdown
  const diaHoyCapitalizado = diaHoy.charAt(0).toUpperCase() + diaHoy.slice(1);

  const UserId = getUserId();

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
    setSelectedDay(diaHoyCapitalizado); // Establecer el día actual al montar el componente
  }, [horarios, UserId, diaHoyCapitalizado, refreshData]);

  if (isLoading) return <h1>Loading...</h1>;

  // Filtrar los días de la semana que no han pasado, incluyendo el día actual
  const diaActualIndex = ParaguayDateUtil.now().day();
  const diasRestantes = diasSemana.filter(
    (_, index) => index >= diaActualIndex
  );

  // Como el backend ahora devuelve datos limpios (un turno por hora),
  // solo necesitamos filtrar por fecha/día seleccionado
  const horariosFiltrados = horarios
    .filter((agenda) => {
      if (!selectedDay) {
        // Si no hay día seleccionado, mostrar solo los de hoy
        const fechaAgenda = ParaguayDateUtil.toParaguayTime(agenda.fecha);
        const hoy = ParaguayDateUtil.startOfDay();
        return fechaAgenda.isSame(hoy, "day");
      } else {
        // Si hay día seleccionado, filtrar por ese día específico
        const targetDate = diasSemana.indexOf(selectedDay);
        const currentDayIndex = ParaguayDateUtil.now().day();

        // Calcular la fecha objetivo
        let daysToAdd = targetDate - currentDayIndex;
        if (daysToAdd < 0) daysToAdd += 7; // Si el día ya pasó esta semana, usar la siguiente

        const fechaObjetivo = ParaguayDateUtil.now().add(daysToAdd, "days");
        const fechaAgenda = ParaguayDateUtil.toParaguayTime(agenda.fecha);

        return fechaAgenda.isSame(fechaObjetivo, "day");
      }
    })
    .sort((a, b) => {
      const horaA = parseInt(a.hora.replace(":", ""), 10);
      const horaB = parseInt(b.hora.replace(":", ""), 10);
      return horaA - horaB; // Orden Ascendente
    });

  return (
    <div>
      <div
        className="max-w-11/12 mx-auto bg-black bg-opacity-80 rounded-lg p-4"
        ref={agendarRef}
        id="agendar"
      >
        <h3 className="flex justify-center mt-8 ml-8 mr-8 border-b-2 border-gray-300 pb-2">
          AGENDA
        </h3>
        <div className="flex border-b-2 justify-between border-gray-300 ml-8 mr-8">
          <h3 className="flex justify-start mt-2 ml-3 ">HORA</h3>
          <Dropdown
            color={""}
            label={`Día: ${selectedDay || diaHoyCapitalizado}`}
            dismissOnClick={true}
          >
            {diasRestantes.map((dia, index) => (
              <Dropdown.Item
                key={index}
                onClick={() => {
                  setSelectedDay(dia); // Actualiza el día seleccionado
                }}
              >
                {dia}
              </Dropdown.Item>
            ))}
          </Dropdown>
        </div>

        {horariosFiltrados.map((agenda) => (
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
            {agenda.diaSemana === "domingo" ? (
              <h3 className="flex justify-center mr-4 text-[#FF7D00]">
                <Button
                  disabled
                  className="flex justify-center bg-gray-400 rounded-lg text-black text-lg items-center"
                >
                  CERRADO
                </Button>
              </h3>
            ) : agenda.estado !== "disponible" ? (
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
        ))}
      </div>
    </div>
  );
};

export default Agenda;
