import { useState, useEffect } from "react";
import { Formik, Field, Form as FormikForm, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import ParaguayDateUtil from "../utils/paraguayDate";

const Form = ({
  handleSubmit,
  agenda,
  getUserId,
  error,
  selectedServices: initialSelectedServices,
  finalCost: initialFinalCost,
  debtStatus,
  debtPayUrl,
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedServices, setSelectedServices] = useState(
    initialSelectedServices || []
  );
  const [finalCost, setFinalCost] = useState(initialFinalCost || 0);
  const [services, setServices] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [selectedBarbero, setSelectedBarbero] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedServices(initialSelectedServices || []);
    setFinalCost(initialFinalCost || 0);
  }, [initialSelectedServices, initialFinalCost]);

  // Cargar servicios desde la API
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/servicios");
        if (response.data && response.data.servicios) {
          setServices(response.data.servicios);
        }
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

  // Cargar barberos activos incluidos en agenda
  useEffect(() => {
    const loadBarberos = async () => {
      try {
        const response = await axios.get(
          "http://localhost:8000/api/barberos/agenda"
        );
        setBarberos(response.data);
      } catch (error) {
        console.error("Error loading barberos:", error);
      }
    };

    loadBarberos();
  }, []);

  // Cargar disponibilidad cuando se tiene la fecha de la agenda
  useEffect(() => {
    const loadDisponibilidad = async () => {
      if (!agenda.fecha) return;

      try {
        setLoading(true);
        const fechaISO = new Date(agenda.fecha).toISOString().split("T")[0];
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
  }, [agenda.fecha]);

  // Cargar barberos activos incluidos en agenda
  useEffect(() => {
    const loadBarberos = async () => {
      try {
        const response = await axios.get(
          "http://localhost:8000/api/barberos/agenda"
        );
        setBarberos(response.data);
      } catch (error) {
        console.error("Error loading barberos:", error);
      }
    };

    loadBarberos();
  }, []);

  // Cargar disponibilidad cuando se selecciona una fecha
  const loadDisponibilidad = async (fecha) => {
    if (!fecha) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8000/api/agenda/disponibilidad/${fecha}`
      );
      setDisponibilidad(response.data.disponibilidad);
    } catch (error) {
      console.error("Error loading disponibilidad:", error);
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object().shape({
    NombreCliente: Yup.string()
      .matches(
        /^[a-zA-Z\s]+$/,
        "El nombre no debe contener caracteres especiales ni números"
      )
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .required("El nombre es obligatorio"),
    NumeroCliente: Yup.string()
      .matches(/^09\d{8}$/, "El número debe tener el formato 09XXXXXXXX")
      .required("El número es obligatorio")
      .test(
        "is-unique",
        "Este número ya está registrado en otra cita",
        async (value) => {
          if (agenda.UserId === getUserId()) return true;
          if (!value) return true;
          try {
            const response = await axios.get(
              "http://localhost:8000/api/agenda"
            );
            const exists = response.data.agendas.some(
              (agenda) => agenda.NumeroCliente === value
            );
            return !exists;
          } catch (error) {
            console.error("Error al verificar el número:", error);
            return false;
          }
        }
      ),
    Servicios: Yup.array().min(1, "Debes seleccionar al menos un servicio"),
  });

  const initialValues = {
    NombreCliente: agenda.NombreCliente || "",
    NumeroCliente: agenda.NumeroCliente || "",
    UserId: agenda.UserId || "",
    Hora: agenda.Hora || "",
    Servicios: selectedServices.map((service) => service.nombre),
    Costo: 0,
  };

  const handleServiceChange = (service, isChecked, setFieldValue) => {
    let updatedServices;
    if (isChecked) {
      updatedServices = [
        ...selectedServices,
        { nombre: service.nombre, precio: service.precio },
      ];
      setFinalCost((prevCost) => prevCost + service.precio);
    } else {
      updatedServices = selectedServices.filter(
        (s) => s.nombre !== service.nombre
      );
      setFinalCost((prevCost) => prevCost - service.precio);
    }
    setSelectedServices(updatedServices);
    setFieldValue(
      "Servicios",
      updatedServices.map((service) => service.nombre)
    );
  };

  return (
    <>
      <div className="text-danger">{error}</div>
      <Formik
        initialValues={initialValues}
        enableReinitialize={true}
        validationSchema={!isCancelling ? validationSchema : null}
        onSubmit={(values, { setSubmitting }) => {
          if (isCancelling) {
            values.hora = agenda.hora;
            values.nombreCliente = "";
            values.numeroCliente = "";
            values.emailCliente = "";
            values.servicios = [];
            values.costoTotal = 0;
          } else {
            values.nombreCliente = getUserId(); // Usar getUserId como identificador del cliente
            values.hora = agenda.hora;
            values.servicios = selectedServices;
            values.costoTotal = finalCost;
            values.estado = debtStatus === "paid" ? "reservado" : "reservado"; // Siempre reservado cuando se agenda
          }
          handleSubmit(values);
          setSubmitting(false);
        }}
      >
        {({ isSubmitting, setFieldValue, values }) => (
          <FormikForm className="space-y-12">
            <div className="border-b border-gray-900/10 pb-12">
              <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 xs:grid-cols-6">
                <div className="sm:col-span-4">
                  <h3
                    className="flex justify-center  ml-8 mr-8 border-b-2 border-gray-300 text-zinc-950"
                    id="servicios"
                  >
                    SERVICIOS
                  </h3>
                  <ErrorMessage
                    name="Servicios"
                    component="div"
                    className="text-red-500 text-sm flex justify-center  ml-8 mr-8"
                  />
                  <div className="servicios-container flex mt-8 justify-evenly items-center">
                    <div className="service-selection">
                      {services.map((service) => (
                        <div key={service.nombre}>
                          <label className="text-zinc-950">
                            <Field
                              className="m-1"
                              type="checkbox"
                              name="Servicios"
                              value={service.nombre}
                              checked={selectedServices.some(
                                (s) => s.nombre === service.nombre
                              )}
                              onChange={(e) =>
                                handleServiceChange(
                                  service,
                                  e.target.checked,
                                  setFieldValue
                                )
                              }
                            />
                            {service.nombre} -{" "}
                            {service.precio?.toLocaleString("es-PY")} Gs
                          </label>
                        </div>
                      ))}

                      <h4 className="text-zinc-950">
                        Precio Final: {finalCost?.toLocaleString("es-PY")} Gs
                      </h4>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <label
                    htmlFor="NombreCliente"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Tu nombre
                  </label>
                  <div className="mt-2">
                    <Field
                      id="NombreCliente"
                      name="NombreCliente"
                      type="text"
                      autoComplete="name"
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                    <ErrorMessage
                      name="NombreCliente"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                </div>

                <div className="col-span-full">
                  <label
                    htmlFor="NumeroCliente"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Tu número de celular
                  </label>
                  <div className="mt-2">
                    <Field
                      name="NumeroCliente"
                      type="text"
                      id="NumeroCliente"
                      autoComplete="phone-number"
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                    <ErrorMessage
                      name="NumeroCliente"
                      component="div"
                      className="text-red-500 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6">
                {agenda.nombreCliente !== "" && (
                  <div className="flex items-center">
                    <h4 className="text-zinc-950">
                      Estado de la Deuda:
                      {debtStatus === "null"
                        ? "Cargando..."
                        : debtStatus === "paid"
                        ? "Pagada"
                        : "No Pagada"}
                    </h4>
                    {debtStatus !== "paid" && debtPayUrl && (
                      <a
                        href={debtPayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                      >
                        Pagar Deuda
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-6 flex items-center justify-end gap-x-6">
                {!debtStatus || debtStatus !== "paid" ? (
                  <>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      Confirmar Cita
                    </button>
                  </>
                ) : null}
                {agenda.UserId && (
                  <button
                    type="submit"
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    onClick={() => {
                      setIsCancelling(true);
                    }}
                  >
                    Cancelar Cita
                  </button>
                )}
              </div>
            </div>
          </FormikForm>
        )}
      </Formik>
    </>
  );
};

export default Form;
