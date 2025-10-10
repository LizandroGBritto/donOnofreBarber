import { useState, useEffect } from "react";
import { Formik, Field, Form as FormikForm, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Swal from "sweetalert2";

const FormReservarConBarbero = ({
  turno,
  onCloseModal,
  refreshData,
  getUserId,
}) => {
  const [barberos, setBarberos] = useState([]);
  const [selectedBarbero, setSelectedBarbero] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState({});
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [error, setError] = useState("");
  const [turnoExistenteInfo, setTurnoExistenteInfo] = useState(null);

  // Cargar barberos activos incluidos en agenda
  useEffect(() => {
    const loadBarberos = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/barberos/agenda`
        );
        setBarberos(response.data);
      } catch (error) {
        console.error("Error loading barberos:", error);
      }
    };

    loadBarberos();
  }, []);

  // Cargar servicios
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/servicios`
        );
        setServices(response.data || []);
      } catch (error) {
        console.error("Error loading services:", error);
        setServices([
          { nombre: "Corte de Pelo", precio: 50000 },
          { nombre: "Decoloración", precio: 200000 },
          { nombre: "Barbería", precio: 40000 },
          { nombre: "Cejas", precio: 20000 },
        ]);
      }
    };

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
        setError("Error al cargar la disponibilidad de barberos");
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

  const initialValues = {
    nombreCliente: "",
    numeroCliente: "",
    barberoId: "",
    servicios: [],
  };

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
          setError(`Ya tienes un turno abierto para el ${turnoExistente.fecha} a las ${turnoExistente.hora} con ${turnoExistente.barbero}`);
          setSubmitting(false);
          return;
        }
        
        // Limpiar error si no hay turno existente
        setError("");
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

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!turno) return null;

  // 🔧 SOLUCIÓN: Verificación mejorada de barberos disponibles/ocupados
  const horaDisponibilidad = disponibilidad[turno.hora];
  const barberosDisponibles = horaDisponibilidad?.barberosDisponibles || [];
  const barberosOcupados = horaDisponibilidad?.barberosOcupados || [];

  // Crear un Set con IDs de barberos ocupados para búsqueda rápida
  const barberosOcupadosIds = new Set(
    barberosOcupados.map((bo) => bo.barbero?._id?.toString()).filter(Boolean)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
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

          {error && (
            <div className={`mb-4 p-4 rounded ${
              turnoExistenteInfo 
                ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {turnoExistenteInfo ? (
                <div>
                  <strong>⚠️ Ya tienes un turno reservado</strong>
                  <p className="mt-1">{error}</p>
                  <p className="mt-2 text-sm">Debes cancelar tu turno actual antes de agendar uno nuevo.</p>
                </div>
              ) : (
                error
              )}
            </div>
          )}

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
          >
            {({ isSubmitting, setFieldValue, values, errors }) => {
              return (
              <FormikForm className={`space-y-6 ${turnoExistenteInfo ? 'opacity-50 pointer-events-none' : ''}`}>
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

                {/* Selección de Barbero - CORREGIDO */}
                <div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">
                    Seleccionar Barbero *
                  </h3>
                  {loading ? (
                    <div className="text-center py-4">
                      Cargando disponibilidad...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {barberos.map((barbero) => {
                        // 🔧 SOLUCIÓN: Verificación correcta del estado del barbero
                        const barberoIdStr = barbero._id.toString();
                        const estaOcupado =
                          barberosOcupadosIds.has(barberoIdStr);

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
                                setSelectedBarbero(newSelected);
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
                                    {barbero.descripcion.substring(0, 50)}...
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {values.barberoId === barbero._id && (
                                  <div className="w-3 h-3 md:w-4 md:h-4 bg-purple-500 rounded-full"></div>
                                )}
                                {estaOcupado && (
                                  <div className="text-red-500 text-lg md:text-xl">🔒</div>
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

                {/* Selección de Servicios */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Seleccionar Servicios *
                  </h3>
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
                    type="button"
                    onClick={onCloseModal}
                    className="w-full md:w-auto px-4 md:px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
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
