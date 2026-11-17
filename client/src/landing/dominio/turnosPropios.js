/**
 * Turnos reservados desde este dispositivo.
 *
 * Al reservar, el servidor devuelve el `editToken` del turno y se guarda como
 * `editToken:<id>`, la misma clave que lee la página /editar-turno/:id. Que el
 * token esté acá es lo que hace "propio" a un turno: no se le pregunta al
 * servidor por número de celular, porque eso permitiría averiguar el turno de
 * cualquiera con solo conocer su número.
 */
const PREFIJO = "editToken:";

const almacenamiento = () => {
  try {
    return window.localStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
};

export const idsDeTurnosPropios = () => {
  const ls = almacenamiento();
  if (!ls) return new Set();
  const ids = new Set();
  try {
    for (let i = 0; i < ls.length; i++) {
      const clave = ls.key(i);
      if (clave?.startsWith(PREFIJO) && ls.getItem(clave)) {
        ids.add(clave.slice(PREFIJO.length));
      }
    }
  } catch {
    return new Set();
  }
  return ids;
};

/** Guarda lo necesario para editar el turno desde este dispositivo. */
export const recordarTurnoPropio = (turno, celular) => {
  const ls = almacenamiento();
  if (!ls || !turno?._id) return false;
  try {
    if (turno.editToken) ls.setItem(`${PREFIJO}${turno._id}`, turno.editToken);
    if (celular) ls.setItem("numeroCliente", celular);
    return true;
  } catch {
    return false; // sin espacio o bloqueado: la reserva igual quedó hecha
  }
};
