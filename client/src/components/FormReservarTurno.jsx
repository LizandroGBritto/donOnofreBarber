import { useState, useEffect } from "react";
import { Formik, Field, Form as FormikForm, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Swal from "sweetalert2";

/**
 * Formulario de reserva de un turno.
 *
 * El barbero ya viene elegido desde la landing (se selecciona antes de ver la
 * agenda), así que acá no se elige de nuevo: llega por props. Eso también
 * elimina la carga de `disponibilidad-barberos`, que existía solo para saber
 * qué barberos quedaban libres en ese horario.
 *
 * Los servicios se piden a `/api/barberos/:id/servicios`, que devuelve el
 * catálogo con los precios de ESTE barbero. Al enviar solo se mandan los ids:
 * el precio lo resuelve el servidor.
 */
const FormReservarTurno = ({ turno, barbero, onCloseModal, refreshData }) => {
  const [services, setServices] = useState([]);
  const [serviciosLoading, setServiciosLoading] = useState(true);
  const [serviciosError, setServiciosError] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [turnoExistenteInfo, setTurnoExistenteInfo] = useState(null);

  // Servicios y precios del barbero elegido. Si falla, no se inventa nada:
  // mostrar precios falsos puede llevar a reservar algo que no existe.
  const loadServices = async () => {
    if (!barbero?._id) return;
    try {
      setServiciosLoading(true);
      setServiciosError(false);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/barberos/${barbero._id}/servicios`
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbero?._id]);

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
    servicios: Yup.array().min(1, "Debes seleccionar al menos un servicio"),
  });

  const handleServiceChange = (service, isChecked, setFieldValue) => {
    const updated = isChecked
      ? selectedServices.some((s) => s._id === service._id)
        ? selectedServices
        : [...selectedServices, service]
      : selectedServices.filter((s) => s._id !== service._id);

    setSelectedServices(updated);
    setFieldValue("servicios", updated);
  };

  // Total estimado. El definitivo lo calcula el servidor y viene en la
  // respuesta: si alguien cambió un precio entre que se abrió el modal y se
  // envió, manda el del servidor.
  const calculateTotalCost = () =>
    selectedServices.reduce((total, s) => total + (s.precio || 0), 0);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setSubmitting(true);

      // Verificar si el usuario ya tiene un turno abierto
      try {
        const verificacion = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/agenda/verificar-turno/${
            values.numeroCliente
          }`
        );
        if (verificacion.data.tieneTurno) {
          setTurnoExistenteInfo(verificacion.data.turno);
          setSubmitting(false);
          return;
        }
        setTurnoExistenteInfo(null);
      } catch (error) {
        console.error("Error verificando turno existente:", error);
        // Si falla la verificación, se sigue: el servidor vuelve a validar.
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/agenda/reservar-con-barbero`,
        {
          fecha: turno.fecha,
          hora: turno.hora,
          barberoId: barbero._id,
          nombreCliente: values.nombreCliente,
          numeroCliente: values.numeroCliente,
          // Solo ids: el precio y el nombre los resuelve el servidor contra
          // los precios de este barbero.
          servicioIds: values.servicios.map((s) => s._id),
        }
      );

      // Guardar el número y el token de edición del turno reservado para
      // poder mostrar "MODIFICAR" sobre el turno propio y habilitar la
      // edición pública desde este mismo dispositivo sin depender de WhatsApp.
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

      const totalConfirmado = response.data?.turno?.costoTotal;

      Swal.fire({
        icon: "success",
        title: "¡Reserva Exitosa!",
        text:
          `Tu cita quedó reservada para el ${new Date(
            turno.fecha
          ).toLocaleDateString()} a las ${turno.hora} con ${barbero.nombre}` +
          (totalConfirmado ? `. Total: ₲${totalConfirmado.toLocaleString()}` : ""),
        confirmButtonText: "¡Perfecto!",
      });

      onCloseModal();
    } catch (error) {
      console.error("Error al reservar:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Error al realizar la reserva",
        confirmButtonText: "Entendido",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!turno || !barbero) return null;

  const initialValues = {
    nombreCliente: "",
    numeroCliente: "",
    servicios: [],
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto content-auto">
        <div className="p-3 md:p-6">
          <div className="flex justify-between items-start mb-4 md:mb-6">
            <div className="pr-4">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900">
                Reservar Turno - {new Date(turno.fecha).toLocaleDateString()} a
                las {turno.hora}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Con <span className="font-medium">{barbero.nombre}</span>
              </p>
            </div>
            <button
              onClick={onCloseModal}
              className="text-gray-400 hover:text-gray-600 text-xl md:text-2xl flex-shrink-0 p-1"
              aria-label="Cerrar"
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
          >
            {({ isSubmitting, setFieldValue, values }) => (
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
                        No se pudieron cargar los servicios. Revisá tu conexión
                        e intentá de nuevo.
                      </p>
                      <button
                        type="button"
                        onClick={loadServices}
                        className="text-sm text-purple-600 underline"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : services.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {barbero.nombre} no tiene servicios disponibles.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {services.map((service) => (
                        <label
                          key={service._id}
                          className="flex items-center space-x-3 p-2 md:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedServices.some(
                              (s) => s._id === service._id
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
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default FormReservarTurno;
