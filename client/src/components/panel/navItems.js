import {
  HiChartBar,
  HiCalendar,
  HiPhotograph,
  HiPhone,
  HiLocationMarker,
  HiClock,
  HiTag,
  HiUserGroup,
  HiBell,
  HiUsers,
  HiCurrencyDollar,
} from "react-icons/hi";

/**
 * Ítems del menú del panel, como datos.
 *
 * Antes los 12 botones estaban escritos DOS VECES a mano en AdminDashboard
 * (una para el sidebar mobile y otra para las tabs de desktop), así que
 * cualquier cambio había que hacerlo en dos lugares y el gate por rol habría
 * que duplicarlo también.
 *
 * `roles` dice quién ve cada ítem. Es comodidad de UI: la autorización real la
 * hace el backend (requireAdmin / requireBarberoPropio / requireTurnoPropio).
 * Ocultar un botón no protege nada por sí solo.
 */
export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: HiChartBar, roles: ["admin", "barbero"] },
  { id: "turnos", label: "Turnos", icon: HiCalendar, roles: ["admin", "barbero"] },
  { id: "mis-precios", label: "Mis Precios", icon: HiCurrencyDollar, roles: ["barbero"] },
  { id: "mis-horarios", label: "Mis Horarios", icon: HiClock, roles: ["barbero"] },
  { id: "banners", label: "Banners", icon: HiPhotograph, roles: ["admin"] },
  { id: "contacto", label: "Contacto", icon: HiPhone, roles: ["admin"] },
  { id: "ubicacion", label: "Ubicación", icon: HiLocationMarker, roles: ["admin"] },
  { id: "horarios", label: "Horarios", icon: HiClock, roles: ["admin"] },
  { id: "servicios", label: "Servicios", icon: HiTag, roles: ["admin"] },
  { id: "barberos", label: "Barberos", icon: HiUserGroup, roles: ["admin"] },
  { id: "notificaciones", label: "Notificaciones", icon: HiBell, roles: ["admin"] },
  { id: "usuarios", label: "Usuarios", icon: HiUsers, roles: ["admin"] },
  { id: "whatsapp", label: "Conexión WhatsApp", icon: HiPhone, roles: ["admin"] },
];

/** Ítems visibles para un rol. Un rol desconocido se trata como admin: es el
 *  mismo criterio conservador que usa authenticate para los usuarios legacy. */
export const itemsParaRol = (rol) =>
  NAV_ITEMS.filter((item) => item.roles.includes(rol === "barbero" ? "barbero" : "admin"));

/** Vista inicial válida para el rol (por si venía guardada una que ya no puede ver). */
export const vistaInicialParaRol = (rol) => itemsParaRol(rol)[0]?.id || "dashboard";
