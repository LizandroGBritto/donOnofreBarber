import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, TextInput, Label, Modal, Alert } from "flowbite-react";
import axios from "axios";

const EditarTurno = () => {
  const { turnoId } = useParams();
  const navigate = useNavigate();

  const [turno, setTurno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Estados para servicios
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombreCliente: "",
    numeroCliente: "",
  });

  const [showCancelModal, setShowCancelModal] = useState(false);

  // Cargar servicios disponibles
  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/servicios");
        const serviciosActivos = response.data.filter((servicio) => servicio.activo) || [];
        console.log("Servicios disponibles cargados:", serviciosActivos);
        setServiciosDisponibles(serviciosActivos);
      } catch (error) {
        console.error("Error al cargar servicios:", error);
      }
    };

    fetchServicios();
  }, []);

  // Efecto para sincronizar servicios cuando se cargan ambos: disponibles y del turno
  useEffect(() => {
    if (turno && turno.servicios && serviciosDisponibles.length > 0) {
      const serviciosIds = turno.servicios.map((s) => {
        // En el modelo de agenda, los servicios tienen servicioId en lugar de _id
        const servicioId = s.servicioId || s._id || s;
        // Verificar que el servicio existe en la lista de disponibles
        const existeServicio = serviciosDisponibles.find(disp => disp._id === servicioId);
        if (existeServicio) {
          return servicioId;
        }
        return null;
      }).filter(Boolean);
      
      console.log("Sincronizando servicios - Turno:", turno.servicios);
      console.log("Servicios disponibles:", serviciosDisponibles.map(s => s._id));
      console.log("Servicios finales seleccionados:", serviciosIds);
      
      setServiciosSeleccionados(serviciosIds);
    }
  }, [turno, serviciosDisponibles]);
  useEffect(() => {
    const fetchTurno = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:8000/api/agenda/${turnoId}`
        );
        const turnoData = response.data.agenda;

        if (!turnoData) {
          setError("Turno no encontrado");
          return;
        }

        // Verificar que el turno tenga un cliente asignado
        if (!turnoData.nombreCliente || turnoData.nombreCliente.trim() === "") {
          setError("Este turno no tiene un cliente asignado");
          return;
        }

        setTurno(turnoData);
        setFormData({
          nombreCliente: turnoData.nombreCliente || "",
          numeroCliente: turnoData.numeroCliente || "",
        });

        // Los servicios se sincronizarán en el useEffect dedicado
        console.log("Turno cargado:", turnoData);
      } catch (error) {
        console.error("Error al cargar turno:", error);
        setError("Error al cargar la información del turno");
      } finally {
        setLoading(false);
      }
    };

    if (turnoId) {
      fetchTurno();
    }
  }, [turnoId]);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar selección de servicios
  const handleServicioChange = (servicioId) => {
    setServiciosSeleccionados((prev) => {
      if (prev.includes(servicioId)) {
        return prev.filter((id) => id !== servicioId);
      } else {
        return [...prev, servicioId];
      }
    });
  };

  // Calcular costo total
  const calcularCostoTotal = () => {
    return serviciosSeleccionados.reduce((total, servicioId) => {
      const servicio = serviciosDisponibles.find((s) => s._id === servicioId);
      return total + (servicio ? parseFloat(servicio.precio) : 0);
    }, 0);
  };

  // Guardar cambios
  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.nombreCliente.trim()) {
      setError("El nombre del cliente es requerido");
      return;
    }

    if (!formData.numeroCliente.trim()) {
      setError("El número de teléfono es requerido");
      return;
    }

    if (serviciosSeleccionados.length === 0) {
      setError("Debe seleccionar al menos un servicio");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // Obtener datos completos de los servicios seleccionados
      const serviciosCompletos = serviciosSeleccionados
        .map((servicioId) => {
          const servicio = serviciosDisponibles.find((s) => s._id === servicioId);
          if (!servicio) {
            console.warn(`Servicio con ID ${servicioId} no encontrado`);
            return null;
          }
          return {
            _id: servicio._id,
            nombre: servicio.nombre,
            precio: servicio.precio,
          };
        })
        .filter(Boolean); // Remover servicios null/undefined

      const costoTotal = calcularCostoTotal();

      await axios.put(`http://localhost:8000/api/agenda/${turnoId}`, {
        ...turno,
        ...formData,
        servicios: serviciosCompletos,
        costoTotal: costoTotal,
        costoServicios: costoTotal,
      });

      setSuccess("Turno actualizado exitosamente");

      // Actualizar el estado local
      setTurno((prev) => ({
        ...prev,
        ...formData,
        servicios: serviciosCompletos,
        costoTotal: costoTotal,
      }));

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error al actualizar turno:", error);
      setError("Error al actualizar el turno. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // Cancelar turno - Cambiar estado a disponible y limpiar datos
  const handleCancelTurno = async () => {
    try {
      setSaving(true);
      setError("");

      await axios.put(`http://localhost:8000/api/agenda/${turnoId}`, {
        ...turno,
        estado: "disponible", // Cambiar a disponible en lugar de cancelado
        nombreCliente: "",
        numeroCliente: "",
        emailCliente: "",
        notas: "",
        servicios: [],
        costoTotal: 0,
        costoServicios: 0,
        barbero: null, // Limpiar barbero asignado también
        nombreBarbero: "",
      });

      setSuccess(
        "Turno liberado exitosamente. Ahora está disponible para nuevas reservas."
      );
      setShowCancelModal(false);

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Error al liberar turno:", error);
      setError("Error al liberar el turno. Inténtalo de nuevo.");
      setShowCancelModal(false);
    } finally {
      setSaving(false);
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">
          Cargando información del turno...
        </div>
      </div>
    );
  }

  if (error && !turno) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="max-w-md">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">❌ {error}</div>
            <Button onClick={() => navigate("/")} color="gray">
              Volver al inicio
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Editar Mi Turno
              </h1>
              <p className="text-gray-600 mt-2">
                Modifica los datos de tu reserva
              </p>
            </div>

            {/* Información del turno */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">
                Información del Turno
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Fecha:</span>
                  <p className="text-gray-700">{formatearFecha(turno.fecha)}</p>
                </div>
                <div>
                  <span className="font-medium">Hora:</span>
                  <p className="text-gray-700">{turno.hora}</p>
                </div>
                {turno.barbero && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Barbero:</span>
                    <div className="flex items-center gap-2 mt-1">
                      {turno.barbero.foto && (
                        <img
                          src={`http://localhost:8000/uploads/${turno.barbero.foto}`}
                          alt={turno.barbero.nombre}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span className="text-gray-700">
                        {turno.barbero.nombre}
                      </span>
                    </div>
                  </div>
                )}
                {turno.servicios && turno.servicios.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Servicios:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {turno.servicios.map((servicio, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs"
                        >
                          {servicio.nombre} - Gs.
                          {servicio.precio?.toLocaleString() || 0}
                        </span>
                      ))}
                    </div>
                    <p className="font-semibold text-green-600 mt-2">
                      Total: Gs.{turno.costoTotal?.toLocaleString() || 0}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mensajes */}
            {error && (
              <Alert color="failure">
                <span className="font-medium">Error:</span> {error}
              </Alert>
            )}

            {success && (
              <Alert color="success">
                <span className="font-medium">Éxito:</span> {success}
              </Alert>
            )}

            {/* Formulario de edición */}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="nombreCliente">Nombre Completo *</Label>
                <TextInput
                  id="nombreCliente"
                  name="nombreCliente"
                  type="text"
                  required
                  value={formData.nombreCliente}
                  onChange={handleInputChange}
                  placeholder="Ingresa tu nombre completo"
                />
              </div>

              <div>
                <Label htmlFor="numeroCliente">Número de Teléfono *</Label>
                <TextInput
                  id="numeroCliente"
                  name="numeroCliente"
                  type="tel"
                  required
                  value={formData.numeroCliente}
                  onChange={handleInputChange}
                  placeholder="Ej: 0981234567"
                />
              </div>

              {/* Selección de Servicios */}
              <div>
                <Label>Servicios</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {serviciosDisponibles.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      Cargando servicios...
                    </p>
                  ) : (
                    serviciosDisponibles.map((servicio) => (
                      <div
                        key={servicio._id}
                        className="flex items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          id={`servicio-${servicio._id}`}
                          checked={serviciosSeleccionados.includes(servicio._id)}
                          onChange={() => {
                            console.log("Cambiando servicio:", servicio._id, "Actuales:", serviciosSeleccionados);
                            handleServicioChange(servicio._id);
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <label
                          htmlFor={`servicio-${servicio._id}`}
                          className="flex-1 text-sm cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-medium text-black">
                            {servicio.nombre}
                          </span>
                          <span className="text-green-600 font-semibold">
                            Gs.{servicio.precio?.toLocaleString() || 0}
                          </span>
                        </label>
                      </div>
                    ))
                  )}
                </div>

                {/* Mostrar total de servicios seleccionados */}
                {serviciosSeleccionados.length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">
                        Total ({serviciosSeleccionados.length} servicio
                        {serviciosSeleccionados.length !== 1 ? "s" : ""}):
                      </span>
                      <span className="font-bold text-green-600 text-lg">
                        Gs.{calcularCostoTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1"
                  style={{ backgroundColor: "var(--primary-color)" }}
                >
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>

                <Button
                  type="button"
                  color="gray"
                  onClick={() => navigate("/")}
                  className="flex-1"
                >
                  Volver al Inicio
                </Button>

                <Button
                  type="button"
                  color="failure"
                  onClick={() => setShowCancelModal(true)}
                  disabled={saving}
                  className="flex-1"
                >
                  Liberar Turno
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Modal de confirmación para liberar */}
        <Modal
          show={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          size="md"
        >
          <Modal.Header>Confirmar Liberación</Modal.Header>
          <Modal.Body>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
                ¿Estás seguro de que quieres liberar este turno?
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Se borrarán todos tus datos y el turno quedará disponible para
                que otros clientes puedan reservarlo.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              color="warning"
              onClick={handleCancelTurno}
              disabled={saving}
            >
              {saving ? "Liberando..." : "Sí, liberar turno"}
            </Button>
            <Button
              color="gray"
              onClick={() => setShowCancelModal(false)}
              disabled={saving}
            >
              No, mantener turno
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default EditarTurno;
