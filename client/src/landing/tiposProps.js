/**
 * Formas compartidas de las props de la landing.
 *
 * Reflejan lo que devuelve la API pública (`/api/barberos/activos`,
 * `/api/barberos/:id/servicios`, `/api/agenda/landing`, `/api/contacto`,
 * `/api/ubicacion`) y lo que arman los módulos de `dominio/`. Si la API agrega
 * campos no hace falta tocarlas: solo declaran lo que los componentes leen.
 */
import PropTypes from "prop-types";

const id = PropTypes.string;

/** Resultado de `usePeticion`: { datos, cargando, error, recargar }. */
export const peticion = (forma) =>
  PropTypes.shape({
    datos: forma,
    cargando: PropTypes.bool.isRequired,
    error: PropTypes.any,
    recargar: PropTypes.func,
  });

/** Un instante de moment-timezone (America/Asuncion). */
export const momento = PropTypes.shape({
  day: PropTypes.func.isRequired,
  isBefore: PropTypes.func,
});

export const barbero = PropTypes.shape({
  _id: id.isRequired,
  nombre: PropTypes.string.isRequired,
  descripcion: PropTypes.string,
  foto: PropTypes.string,
  logo: PropTypes.string,
});

export const servicio = PropTypes.shape({
  _id: id.isRequired,
  nombre: PropTypes.string.isRequired,
  descripcion: PropTypes.string,
  precio: PropTypes.number,
  imagenes: PropTypes.arrayOf(PropTypes.string),
});

/** Turno de la agenda tal como lo arma `armarDias` (con `estadoVista`). */
export const turnoVista = PropTypes.shape({
  _id: id.isRequired,
  fecha: PropTypes.string,
  hora: PropTypes.string.isRequired,
  estadoVista: PropTypes.string.isRequired,
});

export const dia = PropTypes.shape({
  clave: PropTypes.string.isRequired,
  turnos: PropTypes.arrayOf(turnoVista).isRequired,
  libres: PropTypes.number.isRequired,
});

/** Turno confirmado que devuelve `reservar-con-barbero`. */
export const turnoConfirmado = PropTypes.shape({
  _id: id.isRequired,
  fecha: PropTypes.string.isRequired,
  hora: PropTypes.string.isRequired,
  nombreCliente: PropTypes.string,
  barbero: PropTypes.oneOfType([id, PropTypes.shape({ nombre: PropTypes.string })]),
  costoTotal: PropTypes.number,
  costoServicios: PropTypes.number,
  servicios: PropTypes.arrayOf(PropTypes.shape({ nombre: PropTypes.string, precio: PropTypes.number })),
});

export const contacto = PropTypes.shape({
  instagram: PropTypes.string,
  instagramUrl: PropTypes.string,
  whatsapp: PropTypes.string,
  correo: PropTypes.string,
});

export const ubicacion = PropTypes.shape({
  direccion: PropTypes.string,
  enlaceMaps: PropTypes.string,
  coordenadas: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
});

/** Fila de `resumirHorarios`: { clave, etiqueta, rango, dias }. */
export const filaHorario = PropTypes.shape({
  clave: PropTypes.string.isRequired,
  etiqueta: PropTypes.string.isRequired,
  rango: PropTypes.string.isRequired,
  dias: PropTypes.arrayOf(PropTypes.number).isRequired,
});

export const apertura = PropTypes.shape({
  abierto: PropTypes.bool.isRequired,
  texto: PropTypes.string.isRequired,
});

export const aviso = PropTypes.shape({
  titulo: PropTypes.string,
  texto: PropTypes.string.isRequired,
  tipo: PropTypes.string,
});

/** Estado del asistente de reserva (ver `dominio/reserva.js`). */
export const estadoReserva = PropTypes.shape({
  paso: PropTypes.number.isRequired,
  barberoId: id,
  servicioIds: PropTypes.arrayOf(id).isRequired,
  diaClave: PropTypes.string,
  turnoId: id,
  nombre: PropTypes.string.isRequired,
  celular: PropTypes.string.isRequired,
  enviando: PropTypes.bool.isRequired,
  aviso,
  confirmado: turnoConfirmado,
});

export const ref = PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]);
