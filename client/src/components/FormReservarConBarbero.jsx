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

  // Cargar barberos activos
  useEffect(() => {
    const loadBarberos = async () => {
      try {
        const response = await axios.get(
          "http://localhost:8000/api/barberos/activos"
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
        const response = await axios.get("http://localhost:8000/api/servicios");
        // La API devuelve directamente el array de servicios
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

  // Cargar disponibilidad para la fecha del turno
  useEffect(() => {
    const loadDisponibilidad = async () => {
      if (!turno?.fecha) return;

      try {
        setLoading(true);
        const fechaISO = new Date(turno.fecha).toISOString().split("T")[0];
        const response = await axios.get(
          `http://localhost:8000/api/agenda/disponibilidad/${fechaISO}`
        );
        setDisponibilidad(response.data.disponibilidad);
      } catch (error) {
        console.error("Error loading disponibilidad:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDisponibilidad();
  }, [turno?.fecha]);

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

    // Usar el _id si existe, si no usar el nombre como identificador
    const serviceId = service._id || service.nombre;

    if (isChecked) {
      // Verificar que no esté ya seleccionado para evitar duplicados
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
      const reservaData = {
        fecha: turno.fecha,
        hora: turno.hora,
        barberoId: selectedBarbero,
        nombreCliente: values.nombreCliente,
        numeroCliente: values.numeroCliente,
        servicios: selectedServices.map((s) => ({
          servicioId: s._id || null, // Puede ser null para servicios de fallback
          nombre: s.nombre,
          precio: s.precio,
          duracion: s.duracion || 30,
        })),
      };

      const response = await axios.post(
        "http://localhost:8000/api/agenda/reservar-con-barbero",
        reservaData
      );

      Swal.fire({
        icon: "success",
        title: "¡Reserva Exitosa!",
        text: `Tu cita ha sido reservada para el ${new Date(
          turno.fecha
        ).toLocaleDateString()} a las ${turno.hora} con ${
          barberos.find((b) => b._id === selectedBarbero)?.nombre
        }`,
        confirmButtonText: "¡Perfecto!",
      });

      refreshData();
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

  const horaDisponibilidad = disponibilidad[turno.hora];
  const barberosDisponibles = horaDisponibilidad?.barberosDisponibles || [];
  const barberosOcupados = horaDisponibilidad?.barberosOcupados || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Reservar Turno - {new Date(turno.fecha).toLocaleDateString()} a
              las {turno.hora}
            </h2>
            <button
              onClick={onCloseModal}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, setFieldValue, values }) => (
              <FormikForm className="space-y-6">
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

                {/* Selección de Barbero */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Seleccionar Barbero *
                  </h3>
                  {loading ? (
                    <div className="text-center py-4">
                      Cargando disponibilidad...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {barberos.map((barbero) => {
                        const estaDisponible = barberosDisponibles.some(
                          (b) => b._id === barbero._id
                        );
                        const estaOcupado = barberosOcupados.some(
                          (bo) => bo.barbero._id === barbero._id
                        );

                        return (
                          <div
                            key={barbero._id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                              selectedBarbero === barbero._id
                                ? "border-purple-500 bg-purple-50"
                                : estaOcupado
                                ? "border-red-300 bg-red-50 opacity-50 cursor-not-allowed"
                                : "border-gray-300 hover:border-purple-300"
                            }`}
                            onClick={() => {
                              if (!estaOcupado) {
                                const newSelected =
                                  selectedBarbero === barbero._id
                                    ? null
                                    : barbero._id;
                                setSelectedBarbero(newSelected);
                                setFieldValue("barberoId", newSelected || "");
                              }
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <img
                                  src={`http://localhost:8000/uploads/${barbero.foto}`}
                                  alt={barbero.nombre}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                  {barbero.nombre}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {estaOcupado ? "No disponible" : "Disponible"}
                                </p>
                                {barbero.descripcion && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {barbero.descripcion.substring(0, 50)}...
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {selectedBarbero === barbero._id && (
                                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
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
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
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
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          onChange={(e) =>
                            handleServiceChange(
                              service,
                              e.target.checked,
                              setFieldValue
                            )
                          }
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {service.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
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
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={onCloseModal}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !selectedBarbero ||
                      selectedServices.length === 0
                    }
                    className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? "Reservando..." : "Confirmar Reserva"}
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

export default FormReservarConBarbero;
