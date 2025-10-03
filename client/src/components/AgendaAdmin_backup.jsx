import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Dropdown } from "flowbite-react";
import FormAgendarAdmin from "./FormAgendarAdmin";
import ParaguayDateUtil from "../utils/paraguayDate";

const AgendaAdmin = ({ horarios, setHorarios, getUserId, agendarRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

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

  function onCloseModal() {
    setOpenModal(false);
    setSelectedId(null);
  }

  const refreshData = useCallback(() => {
    console.log("🔄 Ejecutando refreshData...");
    setIsLoading(true);
    axios
      .get("http://localhost:8000/api/agenda")
      .then((res) => {
        console.log("=== DATOS DE AGENDA RECIBIDOS ===");
        console.log("Respuesta completa:", res.data);

        if (res.data.agendas && res.data.agendas.length > 0) {
          console.log("Primera agenda completa:", res.data.agendas[0]);
          console.log(
            "Todas las propiedades de la primera agenda:",
            Object.keys(res.data.agendas[0])
          );

          // DEBUG: Verificar costos específicamente
          const agendasConCostos = res.data.agendas.filter(
            (agenda) => agenda.costoTotal > 0 || agenda.costoServicios > 0
          );
          console.log(
            `📊 Agendas con costos encontradas: ${agendasConCostos.length}`
          );

          agendasConCostos.slice(0, 3).forEach((agenda) => {
            console.log(`💰 Agenda ${agenda._id}:`, {
              costoTotal: agenda.costoTotal,
              costoServicios: agenda.costoServicios,
              servicios: agenda.servicios,
              tipoCostoTotal: typeof agenda.costoTotal,
              tipoCostoServicios: typeof agenda.costoServicios,
            });
          });

          // Normalizar los datos
          const agendasNormalizadas = res.data.agendas.map((agenda) => {
            const normalized = {
              _id: agenda._id,
              hora: agenda.hora || agenda.Hora,
              nombreCliente: agenda.nombreCliente || agenda.NombreCliente || "",
              numeroCliente: agenda.numeroCliente || agenda.NumeroCliente || "",
              diaSemana: agenda.diaSemana || agenda.Dia,
              // Asegurar que los costos sean números
              costoTotal: Number(agenda.costoTotal) || 0,
              costoServicios: Number(agenda.costoServicios) || 0,
              servicios: agenda.servicios || [],
              nombreBarbero: agenda.nombreBarbero || "",
              estado: agenda.estado,
              barbero: agenda.barbero,
              UserId: agenda.UserId,
              ...agenda,
            };

            // DEBUG para una agenda con costo
            if (agenda.costoTotal > 0 || agenda.costoServicios > 0) {
              console.log(`🔍 Normalizando agenda ${agenda._id}:`, {
                original: {
                  costoTotal: agenda.costoTotal,
                  costoServicios: agenda.costoServicios,
                },
                normalizado: {
                  costoTotal: normalized.costoTotal,
                  costoServicios: normalized.costoServicios,
                },
              });
            }

            return normalized;
          });

          console.log(
            "✅ Agendas normalizadas (primeras 3):",
            agendasNormalizadas.slice(0, 3)
          );

          // Verificar agendas con costo después de normalizar
          const agendasConCostoFinal = agendasNormalizadas.filter(
            (a) => a.costoTotal > 0
          );
          console.log(
            `🎯 Agendas con costo después de normalizar: ${agendasConCostoFinal.length}`
          );

          if (agendasConCostoFinal.length > 0) {
            console.log(
              "📈 Ejemplos finales con costo:",
              agendasConCostoFinal.slice(0, 3)
            );
          }

          setHorarios(agendasNormalizadas);
        } else {
          console.warn("⚠️ No se recibieron agendas del servidor");
          setHorarios([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error al cargar agendas:", err);
        setIsLoading(false);
      });
  }, [setHorarios]);

  useEffect(() => {
    console.log("🎬 Montando componente AgendaAdmin");
    refreshData();
    setSelectedDay(diaHoy);
  }, [refreshData, diaHoy]); // Agregadas las dependencias

  if (isLoading) return <h1>Loading...</h1>;

  // Filtrar los días de la semana que no han pasado, incluyendo el día actual
  const diasRestantes = diasSemana.filter((_, index) => index >= hoy.getDay());

  // Filtrar los horarios dependiendo del día seleccionado y ordenarlos
  const horariosFiltrados = horarios
    .filter((agenda) => {
      const diaAgenda = agenda.diaSemana;
      return selectedDay ? diaAgenda === selectedDay : true;
    })
    .sort((a, b) => {
      const horaA = parseInt(a.hora.replace(":", ""), 10);
      const horaB = parseInt(b.hora.replace(":", ""), 10);
      return horaA - horaB;
    });

  console.log(
    `📅 Horarios filtrados para ${selectedDay}: ${horariosFiltrados.length}`
  );

  // DEBUG: Verificar costos en horarios filtrados
  const horariosConCosto = horariosFiltrados.filter(
    (agenda) => agenda.costoTotal > 0
  );
  console.log(`💰 Horarios filtrados con costo: ${horariosConCosto.length}`);
  horariosConCosto.forEach((agenda) => {
    console.log(
      `🔍 En horarios filtrados - Agenda ${agenda._id}: costoTotal=${agenda.costoTotal}, servicios=${agenda.servicios?.length}`
    );
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
                  console.log(`📌 Cambiando día a: ${dia}`);
                  setSelectedDay(dia);
                }}
              >
                {dia}
              </Dropdown.Item>
            ))}
          </Dropdown>
        </div>

        {horariosFiltrados.length === 0 ? (
          <div className="flex justify-center mt-8">
            <p className="text-gray-500">No hay horarios para este día</p>
          </div>
        ) : (
          horariosFiltrados.map((agenda) => {
            console.log(
              `🎨 Renderizando agenda ${agenda._id}: costoTotal=${
                agenda.costoTotal
              }, mostrarCosto=${agenda.costoTotal > 0}`
            );
            return (
              <div
                className="flex justify-between border-b-2 border-gray-300 pb-2 pl-4 mt-8 ml-8 mr-8"
                key={agenda._id}
              >
                <div className="flex-col">
                  <h3 className="flex justify-start font-bold">
                    {agenda.hora}
                  </h3>
                  <div className="text-sm">
                    <p className="font-medium">
                      {agenda.nombreCliente === ""
                        ? "Sin Cliente"
                        : agenda.nombreCliente}
                    </p>
                    <p className="text-gray-600">
                      {agenda.numeroCliente === ""
                        ? null
                        : agenda.numeroCliente}
                    </p>
                    {agenda.nombreBarbero && (
                      <p className="text-purple-600 font-medium">
                        Barbero: {agenda.nombreBarbero}
                      </p>
                    )}
                  </div>
                </div>

                {/* Información de servicios y costo */}
                <div className="flex-col text-center mr-4">
                  {agenda.costoTotal > 0 && (
                    <div className="bg-green-100 px-2 py-1 rounded mb-2">
                      <p className="font-bold text-green-800">
                        ₲{agenda.costoTotal.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {agenda.servicios && agenda.servicios.length > 0 && (
                    <div className="text-xs text-gray-600">
                      {agenda.servicios.map((servicio, index) => (
                        <div key={index} className="mb-1">
                          • {servicio.nombre}
                          {servicio.precio &&
                            ` - ₲${servicio.precio.toLocaleString()}`}
                        </div>
                      ))}
                    </div>
                  )}
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
                ) : agenda.nombreCliente !== "" ? (
                  <h3 className="flex-col justify-center mr-4 text-[#FF7D00]">
                    <Button
                      className="flex justify-center bg-green-400 rounded-lg text-black text-lg items-center"
                      onClick={() => {
                        let phoneNumber = agenda.numeroCliente;

                        if (phoneNumber.startsWith("0")) {
                          phoneNumber = `595${phoneNumber.slice(1)}`;
                        }

                        const clientName = agenda.nombreCliente;
                        const appointmentTime = agenda.hora;
                        const message = `Hola ${clientName}, tienes un turno a las ${appointmentTime}, ¡te esperamos!`;
                        const whatsappURL = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(
                          message
                        )}`;

                        window.open(whatsappURL, "_blank");
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
            );
          })
        )}
      </div>
    </>
  );
};

export default AgendaAdmin;
