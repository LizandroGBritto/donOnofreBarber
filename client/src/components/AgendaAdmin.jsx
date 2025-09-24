import axios from "axios";
import { useState, useEffect } from "react";
import { Button, Modal, Dropdown } from "flowbite-react";
import FormAgendarAdmin from "./FormAgendarAdmin";
import ParaguayDateUtil from "../utils/paraguayDate";

const AgendaAdmin = ({ horarios, setHorarios, getUserId, agendarRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

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
  const manana = ParaguayDateUtil.tomorrow();

  function onCloseModal() {
    setOpenModal(false);
    setSelectedId(null);
  }

  useEffect(() => {
    refreshData();
    setSelectedDay(diaHoy); // Establecer el día actual al montar el componente
  }, [setHorarios]);

  function refreshData() {
    axios
      .get("http://localhost:8000/api/agenda")
      .then((res) => {
        setHorarios(res.data.agendas);
        setIsLoading(false);
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  useEffect(() => {
    refreshData();
  }, [setHorarios]);

  if (isLoading) return <h1>Loading...</h1>;

  // Filtrar los días de la semana que no han pasado, incluyendo el día actual
  const diasRestantes = diasSemana.filter((_, index) => index >= hoy.getDay());

  // Filtrar los horarios dependiendo del día seleccionado y ordenarlos de mayor a menor
  const horariosFiltrados = horarios
    .filter((agenda) => (selectedDay ? agenda.Dia === selectedDay : true))
    .sort((a, b) => {
      const horaA = parseInt(a.Hora.replace(":", ""), 10);
      const horaB = parseInt(b.Hora.replace(":", ""), 10);
      return horaA - horaB; // Orden Ascendente
    });

  return (
    <>
      <div ref={agendarRef} id="agendar">
        <h3 className="flex justify-center mt-8 ml-8 mr-8 border-b-2 border-gray-300 pb-2">
          AGENDA
        </h3>
        <div className="flex border-b-2 justify-between border-gray-300 ml-8 mr-8">
          <h3 className="flex justify-start mt-8 ml-8">HORA</h3>
          <Dropdown
            color={""}
            label={`Día: ${selectedDay || diaHoy}`}
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
            <div className="flex-col">
              <h3 className="flex justify-start">{agenda.Hora} </h3>
              <h3 className="flex justify-start">
                {agenda.NombreCliente === ""
                  ? "Sin Cliente"
                  : agenda.NombreCliente}
              </h3>
              <h3 className="flex justify-start">
                {agenda.NumeroCliente === "" ? null : agenda.NumeroCliente}
              </h3>
            </div>

            {diaHoy === "Domingo" ? (
              <h3 className="flex justify-center mr-4 text-[#FF7D00]">
                <Button
                  disabled
                  className="flex justify-center bg-gray-400 rounded-lg text-black text-lg items-center"
                >
                  CERRADO
                </Button>
              </h3>
            ) : agenda.NombreCliente !== "" ? (
              <h3 className="flex-col justify-center mr-4 text-[#FF7D00]">
                <Button
                  className="flex justify-center bg-green-400 rounded-lg text-black text-lg items-center"
                  onClick={() => {
                    let phoneNumber = agenda.NumeroCliente;

                    if (phoneNumber.startsWith("0")) {
                      phoneNumber = `595${phoneNumber.slice(1)}`;
                    }

                    const clientName = agenda.NombreCliente;
                    const appointmentTime = agenda.Hora;
                    const message = `Hola ${clientName}, tienes un turno a las ${appointmentTime}, ¡te esperamos!`;
                    const whatsappURL = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(
                      message
                    )}`;

                    window(whatsappURL, "_blank");
                  }}
                >
                  CONTACTAR
                </Button>
              </h3>
            ) : (
              <h3 className="flex-col justify-center mr-6 text-[#FF7D00]">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    value=""
                    className="sr-only peer"
                    checked={agenda.UserId === "Reservado"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        axios
                          .put(
                            `http://localhost:8000/api/agenda/${agenda._id}`,
                            {
                              NombreCliente: "",
                              NumeroCliente: "",
                              UserId: "Reservado",
                            }
                          )
                          .then((res) => {
                            console.log(res);
                            refreshData();
                          })
                          .catch((err) => {
                            console.log(err);
                          });
                      } else {
                        axios
                          .put(
                            `http://localhost:8000/api/agenda/${agenda._id}`,
                            {
                              NombreCliente: "",
                              NumeroCliente: "",
                              UserId: "",
                            }
                          )
                          .then((res) => {
                            console.log(res);
                            refreshData();
                          })
                          .catch((err) => {
                            console.log(err);
                          });
                      }
                    }}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ms-3 text-sm font-medium text-white dark:text-gray-300 w-14">
                    {agenda.UserId === "Reservado" ? "LIBERAR" : "RESERVAR"}
                  </span>
                </label>
              </h3>
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
                    <FormAgendarAdmin
                      id={selectedId}
                      onCloseModal={onCloseModal}
                      refreshData={refreshData}
                      getUserId={getUserId}
                    />
                  </div>
                </div>
              </Modal.Body>
            </Modal>
          </div>
        ))}
      </div>
    </>
  );
};

export default AgendaAdmin;
