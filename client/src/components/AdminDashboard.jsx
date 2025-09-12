import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  TextInput,
  Label,
  Select,
} from "flowbite-react";
import axios from "axios";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    today: { scheduled: 0, available: 5 },
    week: { scheduled: 0, available: 35 },
    month: { scheduled: 0, available: 150 },
  });

  const [activeView, setActiveView] = useState("dashboard");
  const [turnos, setTurnos] = useState([]);
  const [filteredTurnos, setFilteredTurnos] = useState([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Nuevos estados para filtros adicionales
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Función para obtener las estadísticas de turnos
  const fetchStats = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/agenda/dashboard/estadisticas"
      );
      setStats({
        today: {
          scheduled: response.data.estadisticas.hoy.agendados,
          available: response.data.estadisticas.hoy.disponibles,
        },
        week: {
          scheduled: response.data.estadisticas.semana.agendados,
          available: response.data.estadisticas.semana.disponibles,
        },
        month: {
          scheduled: response.data.estadisticas.mes.agendados,
          available: response.data.estadisticas.mes.disponibles,
        },
      });
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      // Datos de fallback
      setStats({
        today: { scheduled: 4, available: 5 },
        week: { scheduled: 18, available: 35 },
        month: { scheduled: 67, available: 150 },
      });
    }
  };

  // Función para obtener fecha de hoy
  const obtenerFechaHoy = () => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Función para obtener fecha de mañana
  const obtenerFechaManana = () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const year = manana.getFullYear();
    const month = String(manana.getMonth() + 1).padStart(2, "0");
    const day = String(manana.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Función para obtener fechas de la semana actual
  const obtenerFechasSemanaActual = () => {
    const hoy = new Date();
    const diaActual = hoy.getDay();

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(
      hoy.getDate() - diaActual + (diaActual === 0 ? -6 : 1)
    );

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);

    const formatearFechaLocal = (fecha) => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const day = String(fecha.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return {
      desde: formatearFechaLocal(inicioSemana),
      hasta: formatearFechaLocal(finSemana),
    };
  };

  // Función para obtener todos los turnos
  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/api/agenda");
      console.log("Turnos obtenidos:", response.data.agendas);
      setTurnos(response.data.agendas || []);

      // Si no hay filtros establecidos, usar el día de hoy
      if (!fechaDesde && !fechaHasta) {
        const hoy = obtenerFechaHoy();
        setFechaDesde(hoy);
        setFechaHasta(hoy);
      } else {
        setFilteredTurnos(response.data.agendas || []);
      }
    } catch (error) {
      console.error("Error al obtener turnos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar turnos por fecha, estado y búsqueda
  const filtrarTurnos = () => {
    let filtered = [...turnos];
    console.log("Turnos originales:", turnos.length);
    console.log("Filtros activos:", {
      fechaDesde,
      fechaHasta,
      filtroEstado,
      busqueda,
    });

    // Filtro por fecha
    if (fechaDesde) {
      filtered = filtered.filter((turno) => {
        const fechaTurno = new Date(turno.Fecha);
        const fechaDesdeObj = new Date(fechaDesde);
        fechaDesdeObj.setHours(0, 0, 0, 0); // Inicio del día
        return fechaTurno >= fechaDesdeObj;
      });
    }

    if (fechaHasta) {
      filtered = filtered.filter((turno) => {
        const fechaTurno = new Date(turno.Fecha);
        const fechaHastaObj = new Date(fechaHasta);
        fechaHastaObj.setHours(23, 59, 59, 999); // Final del día
        return fechaTurno <= fechaHastaObj;
      });
    }

    // Filtro por estado
    if (filtroEstado) {
      filtered = filtered.filter((turno) => turno.Estado === filtroEstado);
    }

    // Filtro por búsqueda (cliente, día, teléfono, estado)
    if (busqueda) {
      const searchTerm = busqueda.toLowerCase();
      filtered = filtered.filter(
        (turno) =>
          (turno.NombreCliente &&
            turno.NombreCliente.toLowerCase().includes(searchTerm)) ||
          (turno.NumeroCliente &&
            turno.NumeroCliente.toLowerCase().includes(searchTerm)) ||
          (turno.Dia && turno.Dia.toLowerCase().includes(searchTerm)) ||
          (turno.Estado && turno.Estado.toLowerCase().includes(searchTerm))
      );
    }

    console.log("Turnos filtrados:", filtered.length);
    setFilteredTurnos(filtered);
  };

  // Actualizar estado del turno
  const actualizarEstadoTurno = async (id, nuevoEstado) => {
    try {
      await axios.put(`http://localhost:8000/api/agenda/${id}`, {
        ...selectedTurno,
        Estado: nuevoEstado,
      });

      const updatedTurnos = turnos.map((turno) =>
        turno._id === id ? { ...turno, Estado: nuevoEstado } : turno
      );
      setTurnos(updatedTurnos);
      filtrarTurnos();
      setShowModal(false);
      setSelectedTurno(null);
    } catch (error) {
      console.error("Error al actualizar turno:", error);
    }
  };

  // Funciones para filtros rápidos
  const filtrarHoy = () => {
    const manana = obtenerFechaManana();
    setFechaDesde(manana);
    setFechaHasta(manana);
    setFiltroEstado("");
    setBusqueda("");
  };

  const filtrarManana = () => {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() + 2); // Dos días después de hoy
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");
    const pasadoManana = `${year}-${month}-${day}`;

    setFechaDesde(pasadoManana);
    setFechaHasta(pasadoManana);
    setFiltroEstado("");
    setBusqueda("");
  };

  const filtrarSemana = () => {
    const { desde, hasta } = obtenerFechasSemanaActual();
    setFechaDesde(desde);
    setFechaHasta(hasta);
    setFiltroEstado("");
    setBusqueda("");
  };

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setFiltroEstado("");
    setBusqueda("");
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeView === "turnos") {
      fetchTurnos();
    }
  }, [activeView]);

  useEffect(() => {
    filtrarTurnos();
  }, [fechaDesde, fechaHasta, filtroEstado, busqueda, turnos]);

  const StatsCard = ({ title, scheduled, available, period }) => {
    const percentage = (scheduled / available) * 100;

    return (
      <Card className="max-w-sm bg-white bg-opacity-80">
        <div className="flex flex-col items-center pb-4">
          <h5 className="mb-2 text-xl font-medium text-gray-900 dark:text-white">
            {title}
          </h5>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {scheduled}/{available}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Turnos {period}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: "var(--primary-color)",
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {percentage.toFixed(1)}% ocupado
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString("es-ES");
  };

  const formatearEstado = (estado) => {
    const colores = {
      "Sin Pagar": "text-red-600",
      Pagado: "text-green-600",
      Disponible: "text-gray-600",
      Cancelado: "text-yellow-600",
    };
    return <span className={colores[estado] || "text-gray-600"}>{estado}</span>;
  };

  // Componente responsivo para mostrar turnos en móvil
  const TurnoCard = ({ turno }) => (
    <Card className="mb-4 bg-white bg-opacity-80">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {turno.NombreCliente || "Disponible"}
            </h3>
            <p className="text-sm text-gray-900">
              {formatearFecha(turno.Fecha)} - {turno.Hora}
            </p>
          </div>
          <div className="text-right">{formatearEstado(turno.Estado)}</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-900">
            <p>Tel: {turno.NumeroCliente || "N/A"}</p>
            <p>Costo: ${turno.Costo || 0}</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedTurno(turno);
              setShowModal(true);
            }}
          >
            Ver Detalles
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-4 md:p-6">
      <Card className="mb-6 bg-white bg-opacity-80">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Panel de Administración
          </h2>
          <div className="flex gap-2">
            <Button
              color={activeView === "dashboard" ? "purple" : "gray"}
              onClick={() => setActiveView("dashboard")}
            >
              Dashboard
            </Button>
            <Button
              color={activeView === "turnos" ? "purple" : "gray"}
              onClick={() => setActiveView("turnos")}
            >
              Turnos
            </Button>
          </div>
        </div>
      </Card>

      {activeView === "dashboard" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Hoy"
            scheduled={stats.today.scheduled}
            available={stats.today.available}
            period="agendados hoy"
          />

          <StatsCard
            title="Esta Semana"
            scheduled={stats.week.scheduled}
            available={stats.week.available}
            period="en la semana"
          />

          <StatsCard
            title="Este Mes"
            scheduled={stats.month.scheduled}
            available={stats.month.available}
            period="en el mes"
          />
        </div>
      )}

      {activeView === "turnos" && (
        <div>
          {/* Filtros */}
          <Card className="mb-6 bg-white bg-opacity-80">
            <div className="space-y-4">
              {/* Fila 1: Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fechaDesde">Desde</Label>
                  <TextInput
                    id="fechaDesde"
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fechaHasta">Hasta</Label>
                  <TextInput
                    id="fechaHasta"
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                </div>
              </div>

              {/* Fila 2: Estado y búsqueda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="filtroEstado">Estado</Label>
                  <Select
                    id="filtroEstado"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    <option value="Sin Pagar">Sin Pagar</option>
                    <option value="Pagado">Pagado</option>
                    <option value="Disponible">Disponible</option>
                    <option value="Cancelado">Cancelado</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="busqueda">Buscar</Label>
                  <TextInput
                    id="busqueda"
                    type="text"
                    placeholder="Cliente, teléfono, día, estado..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>

              {/* Fila 3: Botones de filtrado rápido */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Button
                  onClick={filtrarHoy}
                  style={{ backgroundColor: "var(--primary-color)" }}
                  size="sm"
                >
                  Hoy
                </Button>
                <Button
                  onClick={filtrarManana}
                  style={{ backgroundColor: "var(--primary-color)" }}
                  size="sm"
                >
                  Mañana
                </Button>
                <Button
                  onClick={filtrarSemana}
                  style={{ backgroundColor: "var(--primary-color)" }}
                  size="sm"
                >
                  Esta Semana
                </Button>
              </div>
            </div>
          </Card>

          {/* Tabla de Turnos - Desktop */}
          <div className="hidden md:block">
            <Card className="bg-white bg-opacity-80">
              {loading ? (
                <div className="text-center py-8">Cargando turnos...</div>
              ) : filteredTurnos.length === 0 ? (
                <div className="text-center py-8">
                  <p>No hay turnos para mostrar con los filtros actuales.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Prueba cambiando las fechas o limpiando los filtros.
                  </p>
                </div>
              ) : (
                <Table>
                  <Table.Head>
                    <Table.HeadCell>Fecha</Table.HeadCell>
                    <Table.HeadCell>Hora</Table.HeadCell>
                    <Table.HeadCell>Cliente</Table.HeadCell>
                    <Table.HeadCell>Teléfono</Table.HeadCell>
                    <Table.HeadCell>Estado</Table.HeadCell>
                    <Table.HeadCell>Costo</Table.HeadCell>
                    <Table.HeadCell>Acciones</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {filteredTurnos.map((turno) => (
                      <Table.Row
                        key={turno._id}
                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      >
                        <Table.Cell>{formatearFecha(turno.Fecha)}</Table.Cell>
                        <Table.Cell>{turno.Hora}</Table.Cell>
                        <Table.Cell>
                          {turno.NombreCliente || "Disponible"}
                        </Table.Cell>
                        <Table.Cell>{turno.NumeroCliente || "-"}</Table.Cell>
                        <Table.Cell>{formatearEstado(turno.Estado)}</Table.Cell>
                        <Table.Cell>${turno.Costo || 0}</Table.Cell>
                        <Table.Cell>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTurno(turno);
                              setShowModal(true);
                            }}
                          >
                            Ver Detalles
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              )}
            </Card>
          </div>

          {/* Vista móvil - Cards */}
          <div className="block md:hidden">
            {loading ? (
              <div className="text-center py-8">Cargando turnos...</div>
            ) : (
              <div>
                {filteredTurnos.map((turno) => (
                  <TurnoCard key={turno._id} turno={turno} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para ver/editar turno */}
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <Modal.Header>Detalles del Turno</Modal.Header>
        <Modal.Body>
          {selectedTurno && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fecha">Fecha</Label>
                <TextInput
                  id="fecha"
                  value={formatearFecha(selectedTurno.Fecha)}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="hora">Hora</Label>
                <TextInput id="hora" value={selectedTurno.Hora} readOnly />
              </div>
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <TextInput
                  id="cliente"
                  value={selectedTurno.NombreCliente || "No asignado"}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <TextInput
                  id="telefono"
                  value={selectedTurno.NumeroCliente || "No asignado"}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="costo">Costo</Label>
                <TextInput
                  id="costo"
                  value={`$${selectedTurno.Costo || 0}`}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select
                  id="estado"
                  value={selectedTurno.Estado}
                  onChange={(e) =>
                    actualizarEstadoTurno(selectedTurno._id, e.target.value)
                  }
                >
                  <option value="Sin Pagar">Sin Pagar</option>
                  <option value="Pagado">Pagado</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Cancelado">Cancelado</option>
                </Select>
              </div>
              {selectedTurno.Servicios &&
                selectedTurno.Servicios.length > 0 && (
                  <div>
                    <Label>Servicios</Label>
                    <div className="mt-2">
                      {selectedTurno.Servicios.map((servicio, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{servicio.name}</span>
                          <span>${servicio.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
