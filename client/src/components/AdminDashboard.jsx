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

  // Estados para banners
  const [banners, setBanners] = useState([]);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    titulo: "",
    descripcion: "",
    imagen: "",
    estado: "activo",
    tipo: "secundario",
    version: "ambos",
    orden: 0,
    enlace: "",
  });
  const [bannerFilters, setBannerFilters] = useState({
    estado: "",
    tipo: "",
    version: "",
  });

  // Estados para upload de imágenes
  const [imagePreview, setImagePreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Estados para gestión de contacto
  const [contacto, setContacto] = useState(null);
  const [contactoForm, setContactoForm] = useState({
    whatsapp: "",
    instagram: "",
    instagramUrl: "",
    correo: "",
  });
  const [showContactoModal, setShowContactoModal] = useState(false);

  // Estados para gestión de ubicación
  const [ubicacion, setUbicacion] = useState(null);
  const [ubicacionForm, setUbicacionForm] = useState({
    direccion: "",
    enlaceMaps: "",
  });
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);

  // Estados para gestión de horarios
  const [horarios, setHorarios] = useState([]);
  const [selectedHorario, setSelectedHorario] = useState(null);
  const [horarioForm, setHorarioForm] = useState({
    hora: "",
    dias: [],
    estado: "activo",
  });
  const [showHorarioModal, setShowHorarioModal] = useState(false);

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
        const fechaTurno = new Date(turno.fecha); // Nuevo campo
        const fechaDesdeObj = new Date(fechaDesde);
        fechaDesdeObj.setHours(0, 0, 0, 0); // Inicio del día
        return fechaTurno >= fechaDesdeObj;
      });
    }

    if (fechaHasta) {
      filtered = filtered.filter((turno) => {
        const fechaTurno = new Date(turno.fecha); // Nuevo campo
        const fechaHastaObj = new Date(fechaHasta);
        fechaHastaObj.setHours(23, 59, 59, 999); // Final del día
        return fechaTurno <= fechaHastaObj;
      });
    }

    // Filtro por estado
    if (filtroEstado) {
      filtered = filtered.filter((turno) => turno.estado === filtroEstado);
    }

    // Filtro por búsqueda (cliente, día, teléfono, estado)
    if (busqueda) {
      const searchTerm = busqueda.toLowerCase();
      filtered = filtered.filter(
        (turno) =>
          (turno.nombreCliente &&
            turno.nombreCliente.toLowerCase().includes(searchTerm)) ||
          (turno.numeroCliente &&
            turno.numeroCliente.toLowerCase().includes(searchTerm)) ||
          (turno.diaSemana &&
            turno.diaSemana.toLowerCase().includes(searchTerm)) ||
          (turno.estado && turno.estado.toLowerCase().includes(searchTerm))
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
        estado: nuevoEstado, // Nuevo campo
      });

      const updatedTurnos = turnos.map((turno) =>
        turno._id === id ? { ...turno, estado: nuevoEstado } : turno
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
    const hoy = obtenerFechaHoy();
    setFechaDesde(hoy);
    setFechaHasta(hoy);
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

  // Funciones para gestión de banners
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/api/banners", {
        params: bannerFilters,
      });
      setBanners(response.data.banners || []);
    } catch (error) {
      console.error("Error al obtener banners:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar upload de imágenes
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);

      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveBanner = async () => {
    try {
      const formData = new FormData();

      // Agregar campos del formulario
      Object.keys(bannerForm).forEach((key) => {
        if (key !== "imagen") {
          formData.append(key, bannerForm[key]);
        }
      });

      // Agregar imagen si se seleccionó una nueva
      if (selectedFile) {
        formData.append("imagen", selectedFile);
      } else if (bannerForm.imagen) {
        formData.append("imagen", bannerForm.imagen);
      }

      if (selectedBanner) {
        // Actualizar banner existente
        await axios.put(
          `http://localhost:8000/api/banners/${selectedBanner._id}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } else {
        // Crear nuevo banner
        await axios.post("http://localhost:8000/api/banners", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      fetchBanners();
      resetBannerForm();
      setShowBannerModal(false);
      setImagePreview("");
      setSelectedFile(null);
    } catch (error) {
      console.error("Error al guardar banner:", error);
    }
  };

  const deleteBanner = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este banner?")) {
      try {
        await axios.delete(`http://localhost:8000/api/banners/${id}`);
        fetchBanners();
      } catch (error) {
        console.error("Error al eliminar banner:", error);
      }
    }
  };

  const toggleBannerStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "activo" ? "inactivo" : "activo";
      await axios.patch(`http://localhost:8000/api/banners/${id}/estado`, {
        estado: newStatus,
      });
      fetchBanners();
    } catch (error) {
      console.error("Error al cambiar estado del banner:", error);
    }
  };

  const resetBannerForm = () => {
    setBannerForm({
      titulo: "",
      descripcion: "",
      imagen: "",
      estado: "activo",
      tipo: "secundario",
      version: "ambos",
      orden: 0,
      enlace: "",
    });
    setSelectedBanner(null);
    setImagePreview("");
    setSelectedFile(null);
  };

  const editBanner = (banner) => {
    setSelectedBanner(banner);
    setBannerForm({ ...banner });
    // Si el banner tiene imagen, mostrarla en el preview
    if (banner.imagen) {
      setImagePreview(`http://localhost:8000/uploads/${banner.imagen}`);
    } else {
      setImagePreview("");
    }
    setSelectedFile(null);
    setShowBannerModal(true);
  };

  // ===== FUNCIONES PARA CONTACTO =====
  const fetchContacto = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/contacto");
      setContacto(response.data.contacto);
    } catch (error) {
      console.error("Error al obtener contacto:", error);
    }
  };

  const saveContacto = async () => {
    try {
      if (contacto) {
        // Actualizar contacto existente
        await axios.put(
          `http://localhost:8000/api/contacto/${contacto._id}`,
          contactoForm
        );
      } else {
        // Crear nuevo contacto
        await axios.post("http://localhost:8000/api/contacto", contactoForm);
      }
      fetchContacto();
      setShowContactoModal(false);
    } catch (error) {
      console.error("Error al guardar contacto:", error);
    }
  };

  const resetContactoForm = () => {
    setContactoForm({
      whatsapp: "",
      instagram: "",
      instagramUrl: "",
      correo: "",
    });
  };

  const editContacto = () => {
    if (contacto) {
      setContactoForm({
        whatsapp: contacto.whatsapp || "",
        instagram: contacto.instagram || "",
        instagramUrl: contacto.instagramUrl || "",
        correo: contacto.correo || "",
      });
    }
    setShowContactoModal(true);
  };

  // ===== FUNCIONES PARA UBICACIÓN =====
  const fetchUbicacion = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/ubicacion");
      setUbicacion(response.data.ubicacion);
    } catch (error) {
      console.error("Error al obtener ubicación:", error);
    }
  };

  const saveUbicacion = async () => {
    try {
      if (ubicacion) {
        // Actualizar ubicación existente
        await axios.put(
          `http://localhost:8000/api/ubicacion/${ubicacion._id}`,
          ubicacionForm
        );
      } else {
        // Crear nueva ubicación
        await axios.post("http://localhost:8000/api/ubicacion", ubicacionForm);
      }
      fetchUbicacion();
      setShowUbicacionModal(false);
    } catch (error) {
      console.error("Error al guardar ubicación:", error);
    }
  };

  const resetUbicacionForm = () => {
    setUbicacionForm({
      direccion: "",
      enlaceMaps: "",
    });
  };

  const editUbicacion = () => {
    if (ubicacion) {
      setUbicacionForm({
        direccion: ubicacion.direccion || "",
        enlaceMaps: ubicacion.enlaceMaps || "",
      });
    }
    setShowUbicacionModal(true);
  };

  // ===== FUNCIONES PARA HORARIOS =====
  const fetchHorarios = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/horarios");
      setHorarios(response.data.horarios || []);
    } catch (error) {
      console.error("Error al obtener horarios:", error);
    }
  };

  const saveHorario = async () => {
    try {
      if (selectedHorario) {
        // Actualizar horario existente
        await axios.put(
          `http://localhost:8000/api/horarios/${selectedHorario._id}`,
          horarioForm
        );
      } else {
        // Crear nuevo horario
        await axios.post("http://localhost:8000/api/horarios", horarioForm);
      }
      fetchHorarios();
      resetHorarioForm();
      setShowHorarioModal(false);
    } catch (error) {
      console.error("Error al guardar horario:", error);
    }
  };

  const deleteHorario = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este horario?")) {
      try {
        await axios.delete(`http://localhost:8000/api/horarios/${id}`);
        fetchHorarios();
      } catch (error) {
        console.error("Error al eliminar horario:", error);
      }
    }
  };

  const toggleHorarioStatus = async (id, currentStatus) => {
    try {
      await axios.patch(`http://localhost:8000/api/horarios/${id}/estado`);
      fetchHorarios();
    } catch (error) {
      console.error("Error al cambiar estado del horario:", error);
    }
  };

  const resetHorarioForm = () => {
    setHorarioForm({
      hora: "",
      dias: [],
      estado: "activo",
    });
    setSelectedHorario(null);
  };

  const editHorario = (horario) => {
    setSelectedHorario(horario);
    setHorarioForm({
      hora: horario.hora,
      dias: horario.dias || [],
      estado: horario.estado,
    });
    setShowHorarioModal(true);
  };

  const handleDiaToggle = (dia) => {
    const diasActualizados = horarioForm.dias.includes(dia)
      ? horarioForm.dias.filter((d) => d !== dia)
      : [...horarioForm.dias, dia];

    setHorarioForm({
      ...horarioForm,
      dias: diasActualizados,
    });
  };

  const regenerarAgendaPorHorarios = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:8000/api/agenda/regenerar-por-horarios",
        {}
      );
      alert(
        `Agenda regenerada exitosamente. ${response.data.turnosCreados} turnos creados, ${response.data.turnosEliminados} turnos eliminados.`
      );
    } catch (error) {
      console.error("Error al regenerar agenda:", error);
      alert("Error al regenerar agenda");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeView === "turnos") {
      fetchTurnos();
    } else if (activeView === "banners") {
      fetchBanners();
    } else if (activeView === "contacto") {
      fetchContacto();
    } else if (activeView === "ubicacion") {
      fetchUbicacion();
    } else if (activeView === "horarios") {
      fetchHorarios();
    }
  }, [activeView]);

  useEffect(() => {
    filtrarTurnos();
  }, [fechaDesde, fechaHasta, filtroEstado, busqueda, turnos]);

  const StatsCard = ({ title, scheduled, available, period }) => {
    const total = scheduled + available;
    const percentage = total > 0 ? (scheduled / total) * 100 : 0;

    return (
      <Card className="max-w-sm" style={{ backgroundColor: "#5B4373" }}>
        <div className="flex flex-col items-center pb-4">
          <h5 className="mb-2 text-xl font-medium text-white">{title}</h5>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {scheduled}/{total}
            </div>
            <div className="text-sm text-gray-300 mb-3">Turnos {period}</div>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: "var(--primary-color)",
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {percentage.toFixed(1)}% ocupado
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {available} disponibles
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
    <Card className="mb-4" style={{ backgroundColor: "#5B4373" }}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg text-white">
              {turno.nombreCliente || "Disponible"}
            </h3>
            <p className="text-sm text-gray-300">
              {formatearFecha(turno.fecha)} - {turno.hora}
            </p>
          </div>
          <div className="text-right">{formatearEstado(turno.estado)}</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-300">
            <p>Tel: {turno.numeroCliente || "N/A"}</p>
            <p>Costo: ${turno.costo || 0}</p>
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
      <Card className="mb-6" style={{ backgroundColor: "#5B4373" }}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-white">
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
            <Button
              color={activeView === "banners" ? "purple" : "gray"}
              onClick={() => setActiveView("banners")}
            >
              Banners
            </Button>
            <Button
              color={activeView === "contacto" ? "purple" : "gray"}
              onClick={() => setActiveView("contacto")}
            >
              Contacto
            </Button>
            <Button
              color={activeView === "ubicacion" ? "purple" : "gray"}
              onClick={() => setActiveView("ubicacion")}
            >
              Ubicación
            </Button>
            <Button
              color={activeView === "horarios" ? "purple" : "gray"}
              onClick={() => setActiveView("horarios")}
            >
              Horarios
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
          <Card className="mb-6" style={{ backgroundColor: "#5B4373" }}>
            <div className="space-y-4">
              {/* Fila 1: Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fechaDesde" className="text-white">
                    Desde
                  </Label>
                  <TextInput
                    id="fechaDesde"
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fechaHasta" className="text-white">
                    Hasta
                  </Label>
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
                  <Label htmlFor="filtroEstado" className="text-white">
                    Estado
                  </Label>
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
                  <Label htmlFor="busqueda" className="text-white">
                    Buscar
                  </Label>
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
            <Card style={{ backgroundColor: "#5B4373" }}>
              {loading ? (
                <div className="text-center py-8 text-white">
                  Cargando turnos...
                </div>
              ) : filteredTurnos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white">
                    No hay turnos para mostrar con los filtros actuales.
                  </p>
                  <p className="text-sm text-gray-300 mt-2">
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
                        <Table.Cell>{formatearFecha(turno.fecha)}</Table.Cell>
                        <Table.Cell>{turno.hora}</Table.Cell>
                        <Table.Cell>
                          {turno.nombreCliente || "Disponible"}
                        </Table.Cell>
                        <Table.Cell>{turno.numeroCliente || "-"}</Table.Cell>
                        <Table.Cell>{formatearEstado(turno.estado)}</Table.Cell>
                        <Table.Cell>${turno.costo || 0}</Table.Cell>
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
              <div className="text-center py-8 text-white">
                Cargando turnos...
              </div>
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

      {/* Vista de Banners */}
      {activeView === "banners" && (
        <div>
          {/* Filtros y acciones para banners */}
          <Card className="mb-6" style={{ backgroundColor: "#5B4373" }}>
            <div className="space-y-4">
              {/* Botón para crear nuevo banner */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  Gestión de Banners
                </h3>
                <Button
                  onClick={() => {
                    resetBannerForm();
                    setShowBannerModal(true);
                  }}
                  style={{ backgroundColor: "var(--primary-color)" }}
                >
                  + Nuevo Banner
                </Button>
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bannerEstado" className="text-white">
                    Estado
                  </Label>
                  <Select
                    id="bannerEstado"
                    value={bannerFilters.estado}
                    onChange={(e) =>
                      setBannerFilters({
                        ...bannerFilters,
                        estado: e.target.value,
                      })
                    }
                  >
                    <option value="">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bannerTipo" className="text-white">
                    Tipo
                  </Label>
                  <Select
                    id="bannerTipo"
                    value={bannerFilters.tipo}
                    onChange={(e) =>
                      setBannerFilters({
                        ...bannerFilters,
                        tipo: e.target.value,
                      })
                    }
                  >
                    <option value="">Todos</option>
                    <option value="principal">Principal</option>
                    <option value="secundario">Secundario</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bannerVersion" className="text-white">
                    Versión
                  </Label>
                  <Select
                    id="bannerVersion"
                    value={bannerFilters.version}
                    onChange={(e) =>
                      setBannerFilters({
                        ...bannerFilters,
                        version: e.target.value,
                      })
                    }
                  >
                    <option value="">Todas</option>
                    <option value="mobile">Móvil</option>
                    <option value="escritorio">Escritorio</option>
                    <option value="ambos">Ambos</option>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabla de Banners - Desktop */}
          <div className="hidden md:block">
            <Card style={{ backgroundColor: "#5B4373" }}>
              {loading ? (
                <div className="text-center py-8 text-white">
                  Cargando banners...
                </div>
              ) : banners.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white">No hay banners para mostrar.</p>
                  <p className="text-sm text-gray-300 mt-2">
                    Crea tu primer banner usando el botón de arriba.
                  </p>
                </div>
              ) : (
                <Table>
                  <Table.Head>
                    <Table.HeadCell>Imagen</Table.HeadCell>
                    <Table.HeadCell>Título</Table.HeadCell>
                    <Table.HeadCell>Tipo</Table.HeadCell>
                    <Table.HeadCell>Versión</Table.HeadCell>
                    <Table.HeadCell>Estado</Table.HeadCell>
                    <Table.HeadCell>Orden</Table.HeadCell>
                    <Table.HeadCell>Acciones</Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {banners.map((banner) => (
                      <Table.Row
                        key={banner._id}
                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      >
                        <Table.Cell>
                          <img
                            src={`http://localhost:8000/uploads/${banner.imagen}`}
                            alt={banner.titulo}
                            className="w-16 h-10 object-cover rounded"
                          />
                        </Table.Cell>
                        <Table.Cell className="font-medium">
                          {banner.titulo}
                        </Table.Cell>
                        <Table.Cell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              banner.tipo === "principal"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {banner.tipo}
                          </span>
                        </Table.Cell>
                        <Table.Cell>{banner.version}</Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            color={
                              banner.estado === "activo" ? "success" : "failure"
                            }
                            onClick={() =>
                              toggleBannerStatus(banner._id, banner.estado)
                            }
                          >
                            {banner.estado}
                          </Button>
                        </Table.Cell>
                        <Table.Cell>{banner.orden}</Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-2">
                            <Button
                              size="xs"
                              onClick={() => editBanner(banner)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="xs"
                              color="failure"
                              onClick={() => deleteBanner(banner._id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              )}
            </Card>
          </div>

          {/* Vista móvil - Cards para banners */}
          <div className="block md:hidden">
            {loading ? (
              <div className="text-center py-8 text-white">
                Cargando banners...
              </div>
            ) : (
              <div>
                {banners.map((banner) => (
                  <Card
                    key={banner._id}
                    className="mb-4"
                    style={{ backgroundColor: "#5B4373" }}
                  >
                    <div className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={`http://localhost:8000/uploads/${banner.imagen}`}
                          alt={banner.titulo}
                          className="w-20 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-white">
                            {banner.titulo}
                          </h3>
                          <p className="text-sm text-gray-300">
                            {banner.tipo} • {banner.version} • Orden:{" "}
                            {banner.orden}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="xs"
                              color={
                                banner.estado === "activo"
                                  ? "success"
                                  : "failure"
                              }
                              onClick={() =>
                                toggleBannerStatus(banner._id, banner.estado)
                              }
                            >
                              {banner.estado}
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => editBanner(banner)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="xs"
                              color="failure"
                              onClick={() => deleteBanner(banner._id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para crear/editar banner */}
      <Modal
        show={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        size="lg"
      >
        <Modal.Header>
          {selectedBanner ? "Editar Banner" : "Crear Banner"}
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bannerTitulo">Título</Label>
              <TextInput
                id="bannerTitulo"
                value={bannerForm.titulo}
                onChange={(e) =>
                  setBannerForm({ ...bannerForm, titulo: e.target.value })
                }
                placeholder="Título del banner"
                required
              />
            </div>

            <div>
              <Label htmlFor="bannerDescripcion">Descripción</Label>
              <TextInput
                id="bannerDescripcion"
                value={bannerForm.descripcion}
                onChange={(e) =>
                  setBannerForm({ ...bannerForm, descripcion: e.target.value })
                }
                placeholder="Descripción del banner"
              />
            </div>

            <div>
              <Label htmlFor="bannerImagen" className="text-white">
                Imagen del Banner
              </Label>
              <input
                id="bannerImagen"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-300 border border-gray-600 rounded-lg cursor-pointer bg-gray-700 focus:outline-none"
              />
              <p className="mt-1 text-sm text-gray-400">
                Formatos soportados: JPG, PNG, WEBP. Se convertirá
                automáticamente a WebP optimizado.
              </p>
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bannerFormEstado">Estado</Label>
                <Select
                  id="bannerFormEstado"
                  value={bannerForm.estado}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, estado: e.target.value })
                  }
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="bannerFormTipo">Tipo</Label>
                <Select
                  id="bannerFormTipo"
                  value={bannerForm.tipo}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, tipo: e.target.value })
                  }
                >
                  <option value="principal">Principal</option>
                  <option value="secundario">Secundario</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="bannerFormVersion">Versión</Label>
                <Select
                  id="bannerFormVersion"
                  value={bannerForm.version}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, version: e.target.value })
                  }
                >
                  <option value="ambos">Ambos</option>
                  <option value="mobile">Móvil</option>
                  <option value="escritorio">Escritorio</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="bannerFormOrden">Orden</Label>
                <TextInput
                  id="bannerFormOrden"
                  type="number"
                  value={bannerForm.orden}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      orden: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bannerEnlace">Enlace (opcional)</Label>
              <TextInput
                id="bannerEnlace"
                value={bannerForm.enlace}
                onChange={(e) =>
                  setBannerForm({ ...bannerForm, enlace: e.target.value })
                }
                placeholder="https://ejemplo.com"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={saveBanner}
            style={{ backgroundColor: "var(--primary-color)" }}
          >
            {selectedBanner ? "Actualizar" : "Crear"} Banner
          </Button>
          <Button color="gray" onClick={() => setShowBannerModal(false)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Vista de Contacto */}
      {activeView === "contacto" && (
        <div>
          <Card className="mb-6" style={{ backgroundColor: "#5B4373" }}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  Gestión de Contacto
                </h3>
                <Button
                  color="purple"
                  onClick={() => {
                    resetContactoForm();
                    setShowContactoModal(true);
                  }}
                >
                  {contacto ? "Editar Contacto" : "+ Crear Contacto"}
                </Button>
              </div>

              {/* Información actual */}
              {contacto ? (
                <div className="bg-white/10 p-4 rounded-lg">
                  <h4 className="text-white font-medium mb-2">
                    Información Actual:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                    <div>
                      <span className="font-medium">WhatsApp:</span>
                      <p>{contacto.whatsapp || "No configurado"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Instagram:</span>
                      <p>{contacto.instagram || "No configurado"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Correo:</span>
                      <p>{contacto.correo || "No configurado"}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button color="purple" size="sm" onClick={editContacto}>
                      Editar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-100/10 border border-yellow-400/30 p-4 rounded-lg">
                  <p className="text-yellow-200">
                    No hay información de contacto configurada. Haz clic en
                    "Crear Contacto" para agregar.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Vista de Ubicación */}
      {activeView === "ubicacion" && (
        <div>
          <Card className="mb-6" style={{ backgroundColor: "#5B4373" }}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  Gestión de Ubicación
                </h3>
                <Button
                  color="purple"
                  onClick={() => {
                    resetUbicacionForm();
                    setShowUbicacionModal(true);
                  }}
                >
                  {ubicacion ? "Editar Ubicación" : "+ Crear Ubicación"}
                </Button>
              </div>

              {/* Información actual */}
              {ubicacion ? (
                <div className="bg-white/10 p-4 rounded-lg">
                  <h4 className="text-white font-medium mb-2">
                    Información Actual:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                    <div>
                      <span className="font-medium">Dirección:</span>
                      <p>{ubicacion.direccion || "No configurado"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Enlace Maps:</span>
                      <p className="break-all">
                        {ubicacion.enlaceMaps || "No configurado"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button color="purple" size="sm" onClick={editUbicacion}>
                      Editar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-100/10 border border-yellow-400/30 p-4 rounded-lg">
                  <p className="text-yellow-200">
                    No hay información de ubicación configurada. Haz clic en
                    "Crear Ubicación" para agregar.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modal para crear/editar contacto */}
      <Modal
        show={showContactoModal}
        onClose={() => setShowContactoModal(false)}
        size="lg"
      >
        <Modal.Header>
          {contacto ? "Editar Contacto" : "Crear Contacto"}
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <TextInput
                id="whatsapp"
                type="text"
                placeholder="Ej: +595123456789"
                value={contactoForm.whatsapp}
                onChange={(e) =>
                  setContactoForm({ ...contactoForm, whatsapp: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <TextInput
                id="instagram"
                type="text"
                placeholder="Ej: @usuario_instagram"
                value={contactoForm.instagram}
                onChange={(e) =>
                  setContactoForm({
                    ...contactoForm,
                    instagram: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="instagramUrl">URL de Instagram (opcional)</Label>
              <TextInput
                id="instagramUrl"
                type="url"
                placeholder="Ej: https://www.instagram.com/usuario_instagram/"
                value={contactoForm.instagramUrl}
                onChange={(e) =>
                  setContactoForm({
                    ...contactoForm,
                    instagramUrl: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="correo">Correo Electrónico</Label>
              <TextInput
                id="correo"
                type="email"
                placeholder="Ej: contacto@ejemplo.com"
                value={contactoForm.correo}
                onChange={(e) =>
                  setContactoForm({ ...contactoForm, correo: e.target.value })
                }
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="purple" onClick={saveContacto}>
            Guardar
          </Button>
          <Button color="gray" onClick={() => setShowContactoModal(false)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para crear/editar ubicación */}
      <Modal
        show={showUbicacionModal}
        onClose={() => setShowUbicacionModal(false)}
        size="lg"
      >
        <Modal.Header>
          {ubicacion ? "Editar Ubicación" : "Crear Ubicación"}
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <TextInput
                id="direccion"
                type="text"
                placeholder="Ej: Av. Principal 123, Asunción, Paraguay"
                value={ubicacionForm.direccion}
                onChange={(e) =>
                  setUbicacionForm({
                    ...ubicacionForm,
                    direccion: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="enlaceMaps">Enlace de Google Maps</Label>
              <TextInput
                id="enlaceMaps"
                type="url"
                placeholder="Ej: https://maps.google.com/..."
                value={ubicacionForm.enlaceMaps}
                onChange={(e) =>
                  setUbicacionForm({
                    ...ubicacionForm,
                    enlaceMaps: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="purple" onClick={saveUbicacion}>
            Guardar
          </Button>
          <Button color="gray" onClick={() => setShowUbicacionModal(false)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Vista de Horarios */}
      {activeView === "horarios" && (
        <div className="space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-black">
                Gestión de Horarios
              </h3>
              <div className="flex gap-2">
                <Button
                  color="blue"
                  onClick={regenerarAgendaPorHorarios}
                  size="sm"
                >
                  Regenerar Agenda
                </Button>
                <Button
                  color="purple"
                  onClick={() => {
                    resetHorarioForm();
                    setShowHorarioModal(true);
                  }}
                >
                  Crear Horario
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <Table.Head>
                  <Table.HeadCell>Hora</Table.HeadCell>
                  <Table.HeadCell>Días de la Semana</Table.HeadCell>
                  <Table.HeadCell>Estado</Table.HeadCell>
                  <Table.HeadCell>Acciones</Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y">
                  {horarios.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan="4" className="text-center">
                        No hay horarios configurados. Haz clic en &quot;Crear
                        Horario&quot; para agregar.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    horarios.map((horario) => (
                      <Table.Row key={horario._id}>
                        <Table.Cell className="font-medium">
                          {horario.hora}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-wrap gap-1">
                            {horario.dias.map((dia, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {dia}
                              </span>
                            ))}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              horario.estado === "activo"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {horario.estado}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-2">
                            <Button
                              color="blue"
                              size="xs"
                              onClick={() => editHorario(horario)}
                            >
                              Editar
                            </Button>
                            <Button
                              color={
                                horario.estado === "activo" ? "yellow" : "green"
                              }
                              size="xs"
                              onClick={() =>
                                toggleHorarioStatus(horario._id, horario.estado)
                              }
                            >
                              {horario.estado === "activo"
                                ? "Desactivar"
                                : "Activar"}
                            </Button>
                            <Button
                              color="red"
                              size="xs"
                              onClick={() => deleteHorario(horario._id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* Modal para crear/editar horario */}
      <Modal show={showHorarioModal} onClose={() => setShowHorarioModal(false)}>
        <Modal.Header>
          {selectedHorario ? "Editar Horario" : "Crear Horario"}
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <Label htmlFor="hora" className="text-black">
                Hora
              </Label>
              <TextInput
                id="hora"
                type="time"
                value={horarioForm.hora}
                onChange={(e) =>
                  setHorarioForm({ ...horarioForm, hora: e.target.value })
                }
              />
            </div>

            <div>
              <Label className="text-black">Días de la Semana</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  "lunes",
                  "martes",
                  "miercoles",
                  "jueves",
                  "viernes",
                  "sabado",
                  "domingo",
                ].map((dia) => (
                  <label key={dia} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={horarioForm.dias.includes(dia)}
                      onChange={() => handleDiaToggle(dia)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="capitalize text-black">{dia}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-black mb-2 block">Estado</Label>
              <div className="flex items-center space-x-3">
                <span
                  className={`text-sm ${
                    horarioForm.estado === "activo"
                      ? "text-gray-500"
                      : "text-black font-medium"
                  }`}
                >
                  Inactivo
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={horarioForm.estado === "activo"}
                    onChange={(e) =>
                      setHorarioForm({
                        ...horarioForm,
                        estado: e.target.checked ? "activo" : "inactivo",
                      })
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                <span
                  className={`text-sm ${
                    horarioForm.estado === "activo"
                      ? "text-black font-medium"
                      : "text-gray-500"
                  }`}
                >
                  Activo
                </span>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="purple" onClick={saveHorario}>
            {selectedHorario ? "Actualizar" : "Crear"}
          </Button>
          <Button color="gray" onClick={() => setShowHorarioModal(false)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

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
