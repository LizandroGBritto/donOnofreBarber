import { useState, useEffect, useMemo } from "react";
import { Formik, Field, Form as FormikForm, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Swal from "sweetalert2";

const FormReservarConBarbero = ({ turno, onCloseModal, refreshData }) => {
  const [barberos, setBarberos] = useState([]);
  const [barberosLoading, setBarberosLoading] = useState(true);
  const [disponibilidad, setDisponibilidad] = useState({});
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [serviciosLoading, setServiciosLoading] = useState(true);
  const [serviciosError, setServiciosError] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [turnoExistenteInfo, setTurnoExistenteInfo] = useState(null);
  const [barberosError, setBarberosError] = useState(false);

  // Cargar barberos activos incluidos en agenda
  const loadBarberos = async () => {
    try {
      setBarberosLoading(true);
      setBarberosError(false);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/barberos/agenda`
      );
      setBarberos(response.data);
    } catch (error) {
      console.error("Error loading barberos:", error);
      setBarberosError(true);
    } finally {
      setBarberosLoading(false);
    }
  };

  useEffect(() => {
    loadBarberos();
  }, []);

  // Cargar servicios. Si falla, no se muestra ningún dato inventado: se
  // informa el error y se ofrece reintentar (mostrar precios falsos podía
  // llevar a un cliente a reservar un servicio que no existe).
  const loadServices = async () => {
    try {
      setServiciosLoading(true);
      setServiciosError(false);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/servicios`
      );
      setServices(response.data || []);
    } catch (error) {
      console.error("Error loading services:", error);
      setServices([]);
      setServiciosError(true);
    } finally {
      setServiciosLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  // 🔧 SOLUCIÓN: Cargar disponibilidad mejorada
  useEffect(() => {
    const loadDisponibilidad = async () => {
      if (!turno?.fecha || !turno?.hora) return;

      try {
        setLoading(true);
        const fechaISO = new Date(turno.fecha).toISOString().split("T")[0];

        // Usar la ruta correcta para obtener disponibilidad por barbero
        const response = await axios.get(
          `${
            import.meta.env.VITE_API_URL
          }/api/agenda/disponibilidad-barberos/${fechaISO}`
        );

        setDisponibilidad(response.data.disponibilidad);
      } catch (error) {
        console.error("Error loading disponibilidad:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDisponibilidad();
  }, [turno?.fecha, turno?.hora]);

  const validationSchema = Yup.object().shape({
    nombreCliente: Yup.string()
      .matches(
        /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
        "El nombre no debe contener caracteres especiales ni números"
      )
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .required("El nombre es obligatorio"),
    numeroCliente: Yup.string()
      .matches(/^09\d{8}$/, "El número debe tener el formato 09XXXXXXXX")
      .required("El número es obligatorio"),
    barberoId: Yup.string().required("Debes seleccionar un barbero"),
    servicios: Yup.array().min(1, "Debes seleccionar al menos un servicio"),
  });

  const handleServiceChange = (service, isChecked, setFieldValue) => {
    let updatedServices;
    const serviceId = service._id || service.nombre;

    if (isChecked) {
      const alreadySelected = selectedServices.some(
        (s) =>
          (s._id && s._id === serviceId) ||
          (!s._id && s.nombre === service.nombre)
      );

      if (!alreadySelected) {
        updatedServices = [...selectedServices, service];
      } else {
        updatedServices = selectedServices;
      }
    } else {
      updatedServices = selectedServices.filter((s) => {
        if (s._id && service._id) {
          return s._id !== service._id;
        } else {
          return s.nombre !== service.nombre;
        }
      });
    }

    setSelectedServices(updatedServices);
    setFieldValue("servicios", updatedServices);
  };

  const calculateTotalCost = () => {
    return selectedServices.reduce(
      (total, service) => total + (service.precio || 0),
      0
    );
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setSubmitting(true);

      // Verificar si el usuario ya tiene un turno abierto
      try {
        const verificacionResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/agenda/verificar-turno/${
            values.numeroCliente
          }`
        );

        if (verificacionResponse.data.tieneTurno) {
          const turnoExistente = verificacionResponse.data.turno;
          setTurnoExistenteInfo(turnoExistente);
          setSubmitting(false);
          return;
        }

        // Limpiar error si no hay turno existente
        setTurnoExistenteInfo(null);
      } catch (error) {
        console.error("Error verificando turno existente:", error);
        // Si hay error en la verificación, continuar con el agendamiento
      }

      const reservaData = {
        fecha: turno.fecha,
        hora: turno.hora,
        barberoId: values.barberoId,
        nombreCliente: values.nombreCliente,
        numeroCliente: values.numeroCliente,
        servicios: values.servicios.map((s) => ({
          servicioId: s._id || null,
          nombre: s.nombre,
          precio: s.precio,
          duracion: s.duracion || 30,
        })),
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/agenda/reservar-con-barbero`,
        reservaData
      );

      // Guardar el número y el token de edición del turno reservado para
      // poder mostrar "MODIFICAR" sobre el turno propio y habilitar la
      // edición pública desde este mismo dispositivo sin depender de
      // WhatsApp.
      try {
        localStorage.setItem("numeroCliente", values.numeroCliente);
        const turnoReservado = response.data?.turno;
        if (turnoReservado?._id && turnoReservado?.editToken) {
          localStorage.setItem(
            `editToken:${turnoReservado._id}`,
            turnoReservado.editToken
          );
        }
      } catch (storageError) {
        console.error("No se pudo guardar en localStorage:", storageError);
      }

      await refreshData();

      Swal.fire({
        icon: "success",
        title: "¡Reserva Exitosa!",
        text: `Tu cita ha sido reservada para el ${new Date(
          turno.fecha
        ).toLocaleDateString()} a las ${turno.hora} con ${
          barberos.find((b) => b._id === values.barberoId)?.nombre
        }`,
        confirmButtonText: "¡Perfecto!",
      });

      onCloseModal();
    } catch (error) {
      console.error("Error al reservar:", error);

      const errorMessage =
        error.response?.data?.message || "Error al realizar la reserva";

      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonText: "Entendido",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 🚀 Optimización: Memoizar cálculos pesados
  // Un barbero solo se ofrece como seleccionable si el servidor confirma un
  // turno real con estado "disponible" para él en ese horario (no basta con
  // que no aparezca como ocupado — eso permitía seleccionar barberos sin
  // ningún turno generado para ese horario).
  const { barberosDisponiblesIds, unicoBarberoDisponible } = useMemo(() => {
    if (!turno?.hora || !disponibilidad || !barberos.length) {
      return {
        barberosDisponiblesIds: new Set(),
        unicoBarberoDisponible: null,
      };
    }

    const infoHora = disponibilidad[turno.hora];
    const barberosDisponiblesServer = infoHora?.barberosDisponibles || [];

    const disponiblesIds = new Set(
      barberosDisponiblesServer.map((b) => b._id?.toString()).filter(Boolean)
    );

    const disponibles = barberos.filter((b) =>
      disponiblesIds.has(b._id.toString())
    );

    const unico = disponibles.length === 1 ? disponibles[0] : null;

    return {
      barberosDisponiblesIds: disponiblesIds,
      unicoBarberoDisponible: unico,
    };
  }, [disponibilidad, turno?.hora, barberos]);

  if (!turno) return null;

  // 🆕 Valores iniciales con barbero único auto-seleccionado
  const initialValues = {
    nombreCliente: "",
    numeroCliente: "",
    barberoId: unicoBarberoDisponible?._id || "",
    servicios: [],
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto content-auto">
        <div className="p-3 md:p-6">
          <div className="flex justify-between items-start mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 pr-4">
              Reservar Turno - {new Date(turno.fecha).toLocaleDateString()} a
              las {turno.hora}
            </h2>
            <button
              onClick={onCloseModal}
              className="text-gray-400 hover:text-gray-600 text-xl md:text-2xl flex-shrink-0 p-1"
            >
              ×
            </button>
          </div>

          {turnoExistenteInfo && (
            <div className="mb-4 p-4 rounded bg-yellow-100 border border-yellow-400 text-yellow-700">
              <strong>⚠️ Ya tienes un turno próximo reservado</strong>
              <p className="mt-1">
                Ya tienes un turno abierto para el {turnoExistenteInfo.fecha} a
                las {turnoExistenteInfo.hora} con {turnoExistenteInfo.barbero}
              </p>
              <p className="mt-2 text-sm">
                Debes cancelar o completar tu turno actual (dentro de las
                próximas 12 horas) antes de agendar uno nuevo.
              </p>
            </div>
          )}

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
          >
            {({ isSubmitting, setFieldValue, values }) => {
              return (
                <FormikForm
                  className={`space-y-6 ${
                    turnoExistenteInfo ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {/* Información del Cliente */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo *
                      </label>
                      <Field
                        name="nombreCliente"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                        placeholder="Tu nombre completo"
                      />
                      <ErrorMessage
                        name="nombreCliente"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Celular *
                      </label>
                      <Field
                        name="numeroCliente"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                        placeholder="09XXXXXXXX"
                      />
                      <ErrorMessage
                        name="numeroCliente"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                  </div>

                  {/* Selección de Barbero - Solo mostrar si NO hay un único barbero disponible */}
                  {!unicoBarberoDisponible && (
                    <div>
                      <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">
                        Seleccionar Barbero *
                      </h3>
                      {loading || barberosLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          {[0, 1].map((i) => (
                            <div
                              key={i}
                              className="border border-gray-200 rounded-lg p-3 md:p-4 animate-pulse"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-200" />
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : barberosError ? (
                        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-center">
                          <p className="text-red-600 text-sm mb-2">
                            No se pudieron cargar los barberos. Revisá tu
                            conexión e intentá de nuevo.
                          </p>
                          <button
                            type="button"
                            onClick={loadBarberos}
                            className="text-sm text-purple-600 underline"
                          >
                            Reintentar
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          {barberos.map((barbero) => {
                            // Solo es seleccionable si el servidor confirmó
                            // un turno "disponible" real para este barbero
                            // en este horario (ver comentario en el useMemo).
                            const barberoIdStr = barbero._id.toString();
                            const estaOcupado =
                              !barberosDisponiblesIds.has(barberoIdStr);

                            return (
                              <div
                                key={barbero._id}
                                className={`border rounded-lg p-3 md:p-4 cursor-pointer transition-all ${
                                  values.barberoId === barbero._id
                                    ? "border-purple-500 bg-purple-50"
                                    : estaOcupado
                                    ? "border-red-300 bg-red-50 opacity-50 cursor-not-allowed"
                                    : "border-gray-300 hover:border-purple-300"
                                }`}
                                onClick={() => {
                                  if (!estaOcupado) {
                                    const newSelected =
                                      values.barberoId === barbero._id
                                        ? ""
                                        : barbero._id;
                                    setFieldValue("barberoId", newSelected);
                                  }
                                }}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <img
                                      src={`${
                                        import.meta.env.VITE_API_URL
                                      }/uploads/${barbero.foto}`}
                                      alt={barbero.nombre}
                                      className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm md:text-base truncate">
                                      {barbero.nombre}
                                    </h4>
                                    <p
                                      className={`text-xs md:text-sm ${
                                        estaOcupado
                                          ? "text-red-500"
                                          : "text-green-500"
                                      }`}
                                    >
                                      {estaOcupado
                                        ? "❌ No disponible"
                                        : "✅ Disponible"}
                                    </p>
                                    {barbero.descripcion && (
                                      <p className="text-xs text-gray-400 mt-1 hidden md:block">
                                        {barbero.descripcion.substring(0, 50)}
                                        ...
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0">
                                    {values.barberoId === barbero._id && (
                                      <div className="w-3 h-3 md:w-4 md:h-4 bg-purple-500 rounded-full"></div>
                                    )}
                                    {estaOcupado && (
                                      <div className="text-red-500 text-lg md:text-xl">
                                        🔒
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <ErrorMessage
                        name="barberoId"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                  )}

                  {/* Mensaje informativo cuando hay un único barbero disponible */}
                  {unicoBarberoDisponible && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <img
                            src={`${import.meta.env.VITE_API_URL}/uploads/${
                              unicoBarberoDisponible.foto
                            }`}
                            alt={unicoBarberoDisponible.nombre}
                            className="w-12 h-12 rounded-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-base">
                            Tu cita será con: {unicoBarberoDisponible.nombre}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            ✅ Único barbero disponible en este horario
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selección de Servicios */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Seleccionar Servicios *
                    </h3>
                    {serviciosLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex items-center space-x-3 p-2 md:p-3 border rounded-lg animate-pulse"
                          >
                            <div className="w-4 h-4 rounded bg-gray-200 flex-shrink-0" />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-1/2" />
                              <div className="h-3 bg-gray-200 rounded w-1/4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : serviciosError ? (
                      <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-red-600 text-sm mb-2">
                          No se pudieron cargar los servicios. Revisá tu
                          conexión e intentá de nuevo.
                        </p>
                        <button
                          type="button"
                          onClick={loadServices}
                          className="text-sm text-purple-600 underline"
                        >
                          Reintentar
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {services.map((service) => (
                          <label
                            key={service._id || service.nombre}
                            className="flex items-center space-x-3 p-2 md:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <Field
                              type="checkbox"
                              name="servicios"
                              value={service._id || service.nombre}
                              checked={selectedServices.some(
                                (s) =>
                                  (s._id && s._id === service._id) ||
                                  (!s._id && s.nombre === service.nombre)
                              )}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 flex-shrink-0"
                              onChange={(e) =>
                                handleServiceChange(
                                  service,
                                  e.target.checked,
                                  setFieldValue
                                )
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm md:text-base">
                                {service.nombre}
                              </div>
                              <div className="text-xs md:text-sm text-gray-500">
                                ₲{service.precio?.toLocaleString()}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    <ErrorMessage
                      name="servicios"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />

                    {selectedServices.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="font-medium text-gray-900">
                          Total: ₲{calculateTotalCost().toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Servicios seleccionados:{" "}
                          {selectedServices.map((s) => s.nombre).join(", ")}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botones */}
                  <div className="flex flex-col md:flex-row justify-end space-y-2 md:space-y-0 md:space-x-4 pt-4 md:pt-6 border-t">
                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !values.barberoId ||
                        values.servicios.length === 0 ||
                        turnoExistenteInfo
                      }
                      className="w-full md:w-auto px-4 md:px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? "Reservando..." : "Confirmar Reserva"}
                    </button>
                    <button
                      type="button"
                      onClick={onCloseModal}
                      className="w-full md:w-auto px-4 md:px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </FormikForm>
              );
            }}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default FormReservarConBarbero;
