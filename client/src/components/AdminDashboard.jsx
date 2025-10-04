import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  TextInput,
  Label,
  Select,
  Textarea,
} from "flowbite-react";
import axios from "axios";
import Dashboard from "./panel/Dashboard";

const AdminDashboard = () => {
  // Función para procesar número de teléfono para WhatsApp
  const procesarNumeroWhatsApp = (numero) => {
    if (!numero) return null;

    // Limpiar el número de espacios y caracteres especiales
    let numeroLimpio = numero.toString().replace(/[\s\-()]/g, "");

    // Si empieza con 0, reemplazar por 595
    if (numeroLimpio.startsWith("0")) {
      numeroLimpio = "595" + numeroLimpio.substring(1);
    }
    // Si no empieza con 595, agregarlo
    else if (!numeroLimpio.startsWith("595")) {
      numeroLimpio = "595" + numeroLimpio;
    }

    return numeroLimpio;
  };

  // Función para enviar mensaje de WhatsApp
  const enviarMensajeWhatsApp = (turno) => {
    const numeroWhatsApp = procesarNumeroWhatsApp(turno.numeroCliente);

    if (!numeroWhatsApp) {
      alert("No hay número de teléfono disponible para este cliente.");
      return;
    }

    const nombreCliente = turno.nombreCliente || "Cliente";
    const fecha = formatearFecha(turno.fecha);
    const dia = new Date(turno.fecha).toLocaleDateString("es-PY", {
      weekday: "long",
    });
    const barbero = turno.barbero ? turno.barbero.nombre : "un barbero";
    const hora = turno.hora;
    const servicios =
      turno.servicios && turno.servicios.length > 0
        ? turno.servicios.map((s) => s.nombre).join(", ")
        : "sus servicios";

    // Construir mensaje base
    let mensaje =
      `¡Hola ${nombreCliente}! 👋\n\n` +
      `💈 Te escribimos desde Alonzo Style para recordarte tu cita programada para el ${dia} ${fecha} a las ${hora} con el barbero ${barbero}.\n\n` +
      `💈 Servicios: ${servicios}\n\n` +
      `💈 Se recomienda llegar 10 minutos antes de la cita, en caso de no poder asistir, por favor avísanos con anticipación para poder reprogramar tu cita.\n\n`;

    // Agregar ubicación si está disponible
    if (ubicacion) {
      mensaje += `📍 Te esperamos aquí: ${ubicacion.direccion}\n`;
      if (ubicacion.enlaceMaps) {
        mensaje += `🗺️ Ver ubicación: ${ubicacion.enlaceMaps}\n\n`;
      } else {
        mensaje += `\n`;
      }
    }

    mensaje += `¡Te esperamos! 💈`;

    const enlaceWhatsApp = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${encodeURIComponent(
      mensaje
    )}`;

    window.open(enlaceWhatsApp, "_blank");
  };

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

  // Estados para gestión de servicios
  const [servicios, setServicios] = useState([]);
  const [selectedServicio, setSelectedServicio] = useState(null);
  const [servicioForm, setServicioForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    activo: true,
  });
  const [showServicioModal, setShowServicioModal] = useState(false);
  const [imagenesServicio, setImagenesServicio] = useState([]);
  const [nuevasImagenes, setNuevasImagenes] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImagenes, setCurrentImagenes] = useState([]);
  const [currentServicioId, setCurrentServicioId] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Estados para gestión de barberos
  const [barberos, setBarberos] = useState([]);
  const [selectedBarbero, setSelectedBarbero] = useState(null);
  const [barberoForm, setBarberoForm] = useState({
    nombre: "",
    descripcion: "",
    activo: true,
  });
  const [showBarberoModal, setShowBarberoModal] = useState(false);
  const [barberoFoto, setBarberoFoto] = useState(null);
  const [barberoLogo, setBarberoLogo] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success"); // success, error, info

  // Función para obtener las estadísticas de turnos
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

  // ===== FUNCIONES PARA SERVICIOS =====
  const fetchServicios = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/servicios/admin/all"
      );
      setServicios(response.data || []);
    } catch (error) {
      console.error("Error al obtener servicios:", error);
    }
  };

  const handleServicioSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("nombre", servicioForm.nombre);
      formData.append("descripcion", servicioForm.descripcion);
      formData.append("precio", servicioForm.precio);
      formData.append("activo", servicioForm.activo);

      // Agregar imágenes nuevas
      nuevasImagenes.forEach((imagen) => {
        formData.append("imagenes", imagen);
      });

      // Si estamos editando y queremos mantener imágenes existentes
      if (selectedServicio && imagenesServicio.length > 0) {
        formData.append("mantenerImagenes", "true");
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      if (selectedServicio) {
        await axios.put(
          `http://localhost:8000/api/servicios/${selectedServicio._id}`,
          formData,
          config
        );
      } else {
        await axios.post(
          "http://localhost:8000/api/servicios",
          formData,
          config
        );
      }
      fetchServicios();
      setShowServicioModal(false);
      resetServicioForm();
    } catch (error) {
      console.error("Error al guardar servicio:", error);
      alert("Error al guardar servicio");
    }
  };

  const deleteServicio = async (id) => {
    if (confirm("¿Estás seguro de que deseas eliminar este servicio?")) {
      try {
        await axios.delete(`http://localhost:8000/api/servicios/${id}`);
        fetchServicios();
      } catch (error) {
        console.error("Error al eliminar servicio:", error);
      }
    }
  };

  const toggleServicioStatus = async (id, currentStatus) => {
    try {
      await axios.patch(`http://localhost:8000/api/servicios/${id}/toggle`);
      fetchServicios();
    } catch (error) {
      console.error("Error al cambiar estado del servicio:", error);
    }
  };

  const editServicio = (servicio) => {
    setSelectedServicio(servicio);
    setServicioForm({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || "",
      precio: servicio.precio,
      activo: servicio.activo,
    });
    setImagenesServicio(servicio.imagenes || []);
    setNuevasImagenes([]);
    setShowServicioModal(true);
  };

  const resetServicioForm = () => {
    setSelectedServicio(null);
    setServicioForm({
      nombre: "",
      descripcion: "",
      precio: "",
      activo: true,
    });
    setImagenesServicio([]);
    setNuevasImagenes([]);
  };

  // Funciones para manejar imágenes
  const handleImagenesChange = (e) => {
    const files = Array.from(e.target.files);
    setNuevasImagenes((prev) => [...prev, ...files]);
  };

  const removeNuevaImagen = (index) => {
    setNuevasImagenes((prev) => prev.filter((_, i) => i !== index));
  };

  // Alias para compatibilidad con el formulario
  const removeNewImage = removeNuevaImagen;

  const deleteExistingImage = async (index) => {
    const imagenNombre = imagenesServicio[index];
    await removeImagenExistente(imagenNombre);
  };

  const openImageGallery = (imagenes, startIndex = 0) => {
    setCurrentImagenes(imagenes);
    setCurrentImageIndex(startIndex);
    setShowImageModal(true);
  };

  const removeImagenExistente = async (imagenNombre) => {
    if (selectedServicio) {
      try {
        await axios.delete(
          `http://localhost:8000/api/servicios/${selectedServicio._id}/imagen/${imagenNombre}`
        );
        setImagenesServicio((prev) =>
          prev.filter((img) => img !== imagenNombre)
        );
      } catch (error) {
        console.error("Error al eliminar imagen:", error);
        alert("Error al eliminar imagen");
      }
    }
  };

  // ===== FUNCIONES PARA BARBEROS =====
  const showNotification = (message, type = "success") => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotificationModal(true);
  };

  const fetchBarberos = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/barberos");
      setBarberos(response.data || []);
    } catch (error) {
      console.error("Error al obtener barberos:", error);
      showNotification("Error al cargar barberos", "error");
    }
  };

  const handleBarberoSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("nombre", barberoForm.nombre);
      formData.append("descripcion", barberoForm.descripcion);
      formData.append("activo", barberoForm.activo);

      if (barberoFoto) {
        formData.append("foto", barberoFoto);
      }
      if (barberoLogo) {
        formData.append("logo", barberoLogo);
      }

      if (selectedBarbero) {
        await axios.put(
          `http://localhost:8000/api/barberos/${selectedBarbero._id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        showNotification("Barbero actualizado exitosamente", "success");
      } else {
        await axios.post("http://localhost:8000/api/barberos", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showNotification("Barbero creado exitosamente", "success");
      }

      fetchBarberos();
      resetBarberoForm();
      setShowBarberoModal(false);
    } catch (error) {
      console.error("Error al guardar barbero:", error);
      showNotification("Error al guardar barbero", "error");
    }
  };

  const editBarbero = (barbero) => {
    setSelectedBarbero(barbero);
    setBarberoForm({
      nombre: barbero.nombre,
      descripcion: barbero.descripcion,
      activo: barbero.activo,
    });
    setShowBarberoModal(true);
  };

  const resetBarberoForm = () => {
    setSelectedBarbero(null);
    setBarberoForm({
      nombre: "",
      descripcion: "",
      activo: true,
    });
    setBarberoFoto(null);
    setBarberoLogo(null);
  };

  const deleteBarbero = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este barbero?")) {
      try {
        await axios.delete(`http://localhost:8000/api/barberos/${id}`);
        fetchBarberos();
        showNotification("Barbero eliminado exitosamente", "success");
      } catch (error) {
        console.error("Error al eliminar barbero:", error);
        showNotification("Error al eliminar barbero", "error");
      }
    }
  };

  const toggleBarberoStatus = async (id) => {
    try {
      const barbero = barberos.find((b) => b._id === id);
      await axios.patch(`http://localhost:8000/api/barberos/${id}/estado`, {
        activo: !barbero.activo,
      });
      fetchBarberos();
      showNotification(
        `Barbero ${!barbero.activo ? "activado" : "desactivado"} exitosamente`,
        "success"
      );
    } catch (error) {
      console.error("Error al cambiar estado del barbero:", error);
      showNotification("Error al cambiar estado del barbero", "error");
    }
  };

  useEffect(() => {
    fetchUbicacion();
  }, []);

  // Funciones para el modal de imágenes
  const openImageModal = (imagenes, servicioId) => {
    setCurrentImagenes(imagenes);
    setCurrentServicioId(servicioId);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setCurrentImagenes([]);
    setCurrentServicioId(null);
  };

  const deleteImageFromModal = async (imagenNombre) => {
    try {
      await axios.delete(
        `http://localhost:8000/api/servicios/${currentServicioId}/imagen/${imagenNombre}`
      );

      // Actualizar la lista actual de imágenes
      const nuevasImagenes = currentImagenes.filter(
        (img) => img !== imagenNombre
      );
      setCurrentImagenes(nuevasImagenes);

      // Refrescar la lista de servicios
      fetchServicios();

      alert("Imagen eliminada exitosamente");
    } catch (error) {
      console.error("Error al eliminar imagen:", error);
      alert("Error al eliminar la imagen");
    }
  };

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
    } else if (activeView === "servicios") {
      fetchServicios();
    } else if (activeView === "barberos") {
      fetchBarberos();
    }
  }, [activeView]);

  useEffect(() => {
    filtrarTurnos();
  }, [fechaDesde, fechaHasta, filtroEstado, busqueda, turnos]);

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
        <div className="flex justify-between items-start">
          <div className="text-sm text-gray-300 flex-1">
            <p>Tel: {turno.numeroCliente || "N/A"}</p>
            <p className="font-semibold text-green-400">
              Costo: ${turno.costoTotal || 0}
            </p>
            {turno.servicios && turno.servicios.length > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                <p className="font-medium mb-2">Servicios:</p>
                <div className="flex flex-wrap gap-1">
                  {turno.servicios.map((servicio, index) => (
                    <div
                      key={index}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs"
                    >
                      {servicio.nombre} - $
                      {servicio.precio?.toLocaleString() || 0}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedTurno(turno);
                setShowModal(true);
              }}
              className="flex-1"
            >
              Ver Detalles
            </Button>
            {turno.numeroCliente && turno.nombreCliente && (
              <Button
                size="sm"
                color="success"
                onClick={() => enviarMensajeWhatsApp(turno)}
                className="flex-1"
              >
                Contactar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-4 md:p-6">
      <Card className="mb-6" style={{ backgroundColor: "rgb(77, 55, 119)" }}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center md:text-left">
            Panel de Administración
          </h2>
          <div className="flex flex-wrap gap-1 md:gap-2 justify-center md:justify-end">
            <Button
              size="sm"
              color={activeView === "dashboard" ? "purple" : "gray"}
              onClick={() => setActiveView("dashboard")}
              className="text-xs md:text-sm"
            >
              Dashboard
            </Button>
            <Button
              size="sm"
              color={activeView === "turnos" ? "purple" : "gray"}
              onClick={() => setActiveView("turnos")}
              className="text-xs md:text-sm"
            >
              Turnos
            </Button>
            <Button
              size="sm"
              color={activeView === "banners" ? "purple" : "gray"}
              onClick={() => setActiveView("banners")}
              className="text-xs md:text-sm"
            >
              Banners
            </Button>
            <Button
              size="sm"
              color={activeView === "contacto" ? "purple" : "gray"}
              onClick={() => setActiveView("contacto")}
              className="text-xs md:text-sm"
            >
              Contacto
            </Button>
            <Button
              size="sm"
              color={activeView === "ubicacion" ? "purple" : "gray"}
              onClick={() => setActiveView("ubicacion")}
              className="text-xs md:text-sm"
            >
              Ubicación
            </Button>
            <Button
              size="sm"
              color={activeView === "horarios" ? "purple" : "gray"}
              onClick={() => setActiveView("horarios")}
              className="text-xs md:text-sm"
            >
              Horarios
            </Button>
            <Button
              size="sm"
              color={activeView === "servicios" ? "purple" : "gray"}
              onClick={() => setActiveView("servicios")}
              className="text-xs md:text-sm"
            >
              Servicios
            </Button>
            <Button
              size="sm"
              color={activeView === "barberos" ? "purple" : "gray"}
              onClick={() => setActiveView("barberos")}
              className="text-xs md:text-sm"
            >
              Barberos
            </Button>
          </div>
        </div>
      </Card>

      {activeView === "dashboard" && <Dashboard />}

      {activeView === "turnos" && (
        <div>
          {/* Filtros */}
          <Card
            className="mb-6"
            style={{ backgroundColor: "rgb(77, 55, 119)" }}
          >
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
                        <Table.Cell>
                          <div className="text-sm">
                            <div className="font-semibold text-green-600">
                              Gs. {turno.costoTotal || 0}
                            </div>
                            {turno.servicios && turno.servicios.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-1">
                                {turno.servicios.map((servicio, index) => (
                                  <div
                                    key={index}
                                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs border"
                                  >
                                    {servicio.nombre} - $
                                    {servicio.precio?.toLocaleString() || 0}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedTurno(turno);
                                setShowModal(true);
                              }}
                            >
                              Ver Detalles
                            </Button>
                            {turno.numeroCliente && turno.nombreCliente && (
                              <Button
                                size="sm"
                                color="success"
                                onClick={() => enviarMensajeWhatsApp(turno)}
                              >
                                Contactar
                              </Button>
                            )}
                          </div>
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
                  <Table.HeadCell className="hidden sm:table-cell">
                    Días de la Semana
                  </Table.HeadCell>
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
                        <Table.Cell className="font-medium text-sm md:text-base">
                          {horario.hora}
                        </Table.Cell>
                        <Table.Cell className="hidden sm:table-cell">
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
                            className={`px-1 md:px-2 py-1 rounded-full text-xs ${
                              horario.estado === "activo"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {horario.estado}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <Button
                              color="blue"
                              size="xs"
                              onClick={() => editHorario(horario)}
                              className="text-xs w-full sm:w-auto"
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
                              className="text-xs w-full sm:w-auto"
                            >
                              {horario.estado === "activo"
                                ? "Desactivar"
                                : "Activar"}
                            </Button>
                            <Button
                              color="red"
                              size="xs"
                              onClick={() => deleteHorario(horario._id)}
                              className="text-xs w-full sm:w-auto"
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

      {/* Sección de Servicios */}
      {activeView === "servicios" && (
        <div className="space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-black">
                Gestión de Servicios
              </h3>
              <Button
                color="purple"
                onClick={() => {
                  resetServicioForm();
                  setShowServicioModal(true);
                }}
              >
                Nuevo Servicio
              </Button>
            </div>

            {servicios.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  No hay servicios registrados.
                </p>
                <p className="text-sm text-gray-400">
                  Haz clic en "Nuevo Servicio" para agregar.
                </p>
              </div>
            ) : (
              <>
                {/* Vista de Cards para Móvil */}
                <div className="block md:hidden space-y-4">
                  {servicios.map((servicio) => (
                    <div
                      key={servicio._id}
                      className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                              {servicio.nombre}
                            </h4>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${
                            servicio.activo
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {servicio.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      {/* Galería de imágenes */}
                      {servicio.imagenes && servicio.imagenes.length > 0 && (
                        <div className="mb-3">
                          <div
                            className="flex gap-2 overflow-x-auto pb-2 cursor-pointer"
                            onClick={() =>
                              openImageModal(servicio.imagenes, servicio._id)
                            }
                          >
                            {servicio.imagenes.map((imagen, index) => (
                              <img
                                key={index}
                                src={`http://localhost:8000/uploads/${imagen}`}
                                alt={`${servicio.nombre} - ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-lg flex-shrink-0 hover:opacity-80"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Precio:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            Gs.{servicio.precio}
                          </span>
                        </div>
                        {servicio.descripcion && (
                          <div>
                            <span className="text-sm text-gray-500">
                              Descripción:
                            </span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              {servicio.descripcion}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            size="xs"
                            color="blue"
                            onClick={() => editServicio(servicio)}
                            className="flex-1"
                          >
                            Editar
                          </Button>
                          <Button
                            size="xs"
                            color={servicio.activo ? "failure" : "success"}
                            onClick={() =>
                              toggleServicioStatus(
                                servicio._id,
                                servicio.activo
                              )
                            }
                            className="flex-1"
                          >
                            {servicio.activo ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
                        <Button
                          size="xs"
                          color="failure"
                          onClick={() => deleteServicio(servicio._id)}
                          className="w-full"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vista de Tabla para Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <Table.Head>
                      <Table.HeadCell>Nombre</Table.HeadCell>
                      <Table.HeadCell>Imágenes</Table.HeadCell>
                      <Table.HeadCell>Descripción</Table.HeadCell>
                      <Table.HeadCell>Precio</Table.HeadCell>
                      <Table.HeadCell>Estado</Table.HeadCell>
                      <Table.HeadCell>Acciones</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                      {servicios.map((servicio) => (
                        <Table.Row
                          key={servicio._id}
                          className="bg-white dark:bg-gray-800"
                        >
                          <Table.Cell className="font-medium text-gray-900 dark:text-white">
                            <span className="truncate">{servicio.nombre}</span>
                          </Table.Cell>
                          <Table.Cell>
                            {servicio.imagenes &&
                            servicio.imagenes.length > 0 ? (
                              <div
                                className="flex gap-1 overflow-x-auto cursor-pointer"
                                onClick={() =>
                                  openImageModal(
                                    servicio.imagenes,
                                    servicio._id
                                  )
                                }
                              >
                                {servicio.imagenes
                                  .slice(0, 3)
                                  .map((imagen, index) => (
                                    <img
                                      key={index}
                                      src={`http://localhost:8000/uploads/${imagen}`}
                                      alt={`${servicio.nombre} - ${index + 1}`}
                                      className="w-8 h-8 object-cover rounded flex-shrink-0 hover:opacity-80"
                                    />
                                  ))}
                                {servicio.imagenes.length > 3 && (
                                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs">
                                    +{servicio.imagenes.length - 3}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                Sin imágenes
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell className="max-w-xs">
                            <span className="truncate block">
                              {servicio.descripcion || "Sin descripción"}
                            </span>
                          </Table.Cell>
                          <Table.Cell className="font-medium">
                            Gs.{servicio.precio}
                          </Table.Cell>
                          <Table.Cell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                servicio.activo
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {servicio.activo ? "Activo" : "Inactivo"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex gap-2">
                              <Button
                                size="xs"
                                color="blue"
                                onClick={() => editServicio(servicio)}
                              >
                                Editar
                              </Button>
                              <Button
                                size="xs"
                                color={servicio.activo ? "failure" : "success"}
                                onClick={() =>
                                  toggleServicioStatus(
                                    servicio._id,
                                    servicio.activo
                                  )
                                }
                              >
                                {servicio.activo ? "Desactivar" : "Activar"}
                              </Button>
                              <Button
                                size="xs"
                                color="failure"
                                onClick={() => deleteServicio(servicio._id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* SECCIÓN BARBEROS */}
      {activeView === "barberos" && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Gestión de Barberos
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Administra la información de los barberos del equipo
                </p>
              </div>
              <Button
                color="purple"
                onClick={() => {
                  resetBarberoForm();
                  setShowBarberoModal(true);
                }}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Nuevo Barbero
              </Button>
            </div>

            {barberos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No hay barberos registrados aún.
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Haz clic en "Nuevo Barbero" para agregar.
                </p>
              </div>
            ) : (
              <>
                {/* Vista de tarjetas para móvil */}
                <div className="grid gap-4 md:hidden">
                  {barberos.map((barbero) => (
                    <div
                      key={barbero._id}
                      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={`http://localhost:8000/uploads/${barbero.foto}`}
                          alt={barbero.nombre}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {barbero.nombre}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                barbero.activo
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {barbero.activo ? "Activo" : "Inactivo"}
                            </span>
                          </div>

                          {barbero.logo && (
                            <div className="mb-2">
                              <img
                                src={`http://localhost:8000/uploads/${barbero.logo}`}
                                alt={`Logo de ${barbero.nombre}`}
                                className="w-8 h-8 object-contain"
                              />
                            </div>
                          )}

                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                            {barbero.descripcion}
                          </p>

                          <div className="flex gap-2">
                            <Button
                              size="xs"
                              color="blue"
                              onClick={() => editBarbero(barbero)}
                              className="flex-1"
                            >
                              Editar
                            </Button>
                            <Button
                              size="xs"
                              color={barbero.activo ? "yellow" : "green"}
                              onClick={() => toggleBarberoStatus(barbero._id)}
                              className="flex-1"
                            >
                              {barbero.activo ? "Desactivar" : "Activar"}
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              onClick={() => deleteBarbero(barbero._id)}
                              className="flex-1"
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vista de tabla para desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <Table.Head>
                      <Table.HeadCell>Barbero</Table.HeadCell>
                      <Table.HeadCell>Logo</Table.HeadCell>
                      <Table.HeadCell>Descripción</Table.HeadCell>
                      <Table.HeadCell>Estado</Table.HeadCell>
                      <Table.HeadCell>Acciones</Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                      {barberos.map((barbero) => (
                        <Table.Row
                          key={barbero._id}
                          className="bg-white dark:bg-gray-800"
                        >
                          <Table.Cell className="font-medium">
                            <div className="flex items-center gap-3">
                              <img
                                src={`http://localhost:8000/uploads/${barbero.foto}`}
                                alt={barbero.nombre}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                              <span className="text-gray-900 dark:text-white">
                                {barbero.nombre}
                              </span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            {barbero.logo ? (
                              <img
                                src={`http://localhost:8000/uploads/${barbero.logo}`}
                                alt={`Logo de ${barbero.nombre}`}
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">
                                Sin logo
                              </span>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {barbero.descripcion}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                barbero.activo
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {barbero.activo ? "Activo" : "Inactivo"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex gap-2">
                              <Button
                                size="xs"
                                color="blue"
                                onClick={() => editBarbero(barbero)}
                              >
                                Editar
                              </Button>
                              <Button
                                size="xs"
                                color={barbero.activo ? "yellow" : "green"}
                                onClick={() => toggleBarberoStatus(barbero._id)}
                              >
                                {barbero.activo ? "Desactivar" : "Activar"}
                              </Button>
                              <Button
                                size="xs"
                                color="failure"
                                onClick={() => deleteBarbero(barbero._id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Modal para crear/editar barbero */}
      <Modal show={showBarberoModal} onClose={() => setShowBarberoModal(false)}>
        <Modal.Header>
          {selectedBarbero ? "Editar Barbero" : "Nuevo Barbero"}
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleBarberoSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombreBarbero">Nombre del Barbero *</Label>
              <TextInput
                id="nombreBarbero"
                type="text"
                required
                value={barberoForm.nombre}
                onChange={(e) =>
                  setBarberoForm({ ...barberoForm, nombre: e.target.value })
                }
                placeholder="Nombre completo del barbero"
              />
            </div>

            <div>
              <Label htmlFor="descripcionBarbero">Descripción *</Label>
              <Textarea
                id="descripcionBarbero"
                required
                rows={3}
                value={barberoForm.descripcion}
                onChange={(e) =>
                  setBarberoForm({
                    ...barberoForm,
                    descripcion: e.target.value,
                  })
                }
                placeholder="Descripción profesional del barbero, especialidades, experiencia..."
              />
            </div>

            <div>
              <Label htmlFor="fotoBarbero">Foto del Barbero *</Label>
              <input
                id="fotoBarbero"
                type="file"
                accept="image/*"
                required={!selectedBarbero}
                onChange={(e) => setBarberoFoto(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formatos: JPG, PNG, WEBP. Tamaño máximo: 5MB
              </p>
              {selectedBarbero && selectedBarbero.foto && (
                <div className="mt-2">
                  <img
                    src={`http://localhost:8000/uploads/${selectedBarbero.foto}`}
                    alt="Foto actual"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <p className="text-xs text-gray-500">Foto actual</p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="logoBarbero">Logo del Barbero (Opcional)</Label>
              <input
                id="logoBarbero"
                type="file"
                accept="image/*"
                onChange={(e) => setBarberoLogo(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Logo personal o marca del barbero (opcional)
              </p>
              {selectedBarbero && selectedBarbero.logo && (
                <div className="mt-2">
                  <img
                    src={`http://localhost:8000/uploads/${selectedBarbero.logo}`}
                    alt="Logo actual"
                    className="w-16 h-16 object-contain"
                  />
                  <p className="text-xs text-gray-500">Logo actual</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="activoBarbero"
                type="checkbox"
                checked={barberoForm.activo}
                onChange={(e) =>
                  setBarberoForm({ ...barberoForm, activo: e.target.checked })
                }
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <Label htmlFor="activoBarbero">Barbero activo</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" color="purple" className="flex-1">
                {selectedBarbero ? "Actualizar" : "Crear"} Barbero
              </Button>
              <Button
                type="button"
                color="gray"
                onClick={() => setShowBarberoModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Modal para crear/editar servicio */}
      <Modal
        show={showServicioModal}
        onClose={() => setShowServicioModal(false)}
      >
        <Modal.Header>
          {selectedServicio ? "Editar Servicio" : "Nuevo Servicio"}
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleServicioSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre del Servicio *</Label>
              <TextInput
                id="nombre"
                type="text"
                required
                value={servicioForm.nombre}
                onChange={(e) =>
                  setServicioForm({ ...servicioForm, nombre: e.target.value })
                }
                placeholder="Ej: Corte de cabello"
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <TextInput
                id="descripcion"
                type="text"
                value={servicioForm.descripcion}
                onChange={(e) =>
                  setServicioForm({
                    ...servicioForm,
                    descripcion: e.target.value,
                  })
                }
                placeholder="Descripción del servicio"
              />
            </div>

            <div>
              <Label htmlFor="precio">Precio *</Label>
              <TextInput
                id="precio"
                type="number"
                required
                min="0"
                step="0.01"
                value={servicioForm.precio}
                onChange={(e) =>
                  setServicioForm({ ...servicioForm, precio: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            {/* Sección de imágenes existentes (solo en edición) */}
            {selectedServicio && imagenesServicio.length > 0 && (
              <div>
                <Label>Imágenes Actuales</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {imagenesServicio.map((imagen, index) => (
                    <div key={index} className="relative">
                      <img
                        src={`http://localhost:8000/uploads/${imagen}`}
                        alt={`${servicioForm.nombre} - ${index + 1}`}
                        className="w-full h-20 object-cover rounded border cursor-pointer"
                        onClick={() =>
                          openImageGallery(imagenesServicio, index)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => deleteExistingImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sección para subir nuevas imágenes */}
            <div>
              <Label htmlFor="imagenes">Agregar Imágenes</Label>
              <input
                id="imagenes"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImagenesChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="mt-1 text-sm text-gray-500">
                Puedes seleccionar múltiples imágenes. PNG, JPG, JPEG, WEBP
                (máx. 5MB cada una)
              </p>
            </div>

            {/* Vista previa de nuevas imágenes */}
            {nuevasImagenes.length > 0 && (
              <div>
                <Label>Vista Previa de Nuevas Imágenes</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {nuevasImagenes.map((imagen, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(imagen)}
                        alt={`Nueva imagen ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button color="purple" onClick={handleServicioSubmit}>
            {selectedServicio ? "Actualizar" : "Crear"}
          </Button>
          <Button color="gray" onClick={() => setShowServicioModal(false)}>
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
                  value={formatearFecha(selectedTurno.fecha)}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="hora">Hora</Label>
                <TextInput id="hora" value={selectedTurno.hora} readOnly />
              </div>
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <TextInput
                  id="cliente"
                  value={selectedTurno.nombreCliente || "No asignado"}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <TextInput
                  id="telefono"
                  value={selectedTurno.numeroCliente || "No asignado"}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="costo">Costo</Label>
                <TextInput
                  id="costo"
                  value={`$${selectedTurno.costoTotal || 0}`}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select
                  id="estado"
                  value={selectedTurno.estado}
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
              {selectedTurno.servicios &&
                selectedTurno.servicios.length > 0 && (
                  <div>
                    <Label>Servicios</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTurno.servicios.map((servicio, index) => (
                        <div
                          key={index}
                          className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1 min-w-[200px]"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-green-800">
                              {servicio.nombre}
                            </span>
                            <span className="font-bold text-green-600">
                              Gs.{servicio.precio?.toLocaleString() || 0}
                            </span>
                          </div>
                          {servicio.duracion && (
                            <div className="text-xs text-green-600 mt-1">
                              Duración: {servicio.duracion} min
                            </div>
                          )}
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

      {/* Modal para ver y eliminar imágenes */}
      <Modal show={showImageModal} onClose={closeImageModal} size="4xl">
        <Modal.Header>Galería de Imágenes</Modal.Header>
        <Modal.Body>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentImagenes.map((imagen, index) => (
              <div key={index} className="relative group">
                <img
                  src={`http://localhost:8000/uploads/${imagen}`}
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <Button
                    color="red"
                    size="sm"
                    onClick={() => deleteImageFromModal(imagen)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {currentImagenes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay imágenes para mostrar
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={closeImageModal}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Notificación */}
      <Modal
        show={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        size="md"
      >
        <Modal.Header>
          <div className="flex items-center gap-2">
            {notificationType === "success" && (
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
            {notificationType === "error" && (
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
            {notificationType === "info" && (
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
            <span className="font-medium">
              {notificationType === "success" && "¡Éxito!"}
              {notificationType === "error" && "Error"}
              {notificationType === "info" && "Información"}
            </span>
          </div>
        </Modal.Header>
        <Modal.Body>
          <p className="text-gray-700 dark:text-gray-300">
            {notificationMessage}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            color={
              notificationType === "success"
                ? "success"
                : notificationType === "error"
                ? "failure"
                : "gray"
            }
            onClick={() => setShowNotificationModal(false)}
          >
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
