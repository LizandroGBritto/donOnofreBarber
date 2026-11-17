import { momentoDelTurno } from "./agenda";

/**
 * Aviso push antes del turno: una hora antes y, si ya falta menos, se recorta
 * de a 20 minutos (40, 20) hasta 5. Con 5 minutos o menos ya no se ofrece.
 *
 * El servidor aplica la misma regla al registrarlo
 * (server/services/recordatorios.service.js): si se cambia acá, cambiarla allá.
 */
export const AVISOS_MINUTOS = [60, 40, 20, 5];

/** La mayor anticipación que todavía queda por delante, o null. */
export const minutosDeAviso = (minutosRestantes) =>
  AVISOS_MINUTOS.find((m) => minutosRestantes > m) ?? null;

/** Con cuánta anticipación se puede avisar este turno, mirado desde `ahora`. */
export const avisoParaTurno = (turno, ahora) => {
  if (!turno?.fecha || !turno?.hora || !ahora) return null;
  const restantes = momentoDelTurno(turno).diff(ahora, "seconds") / 60;
  return minutosDeAviso(restantes);
};

/** "una hora", "40 minutos", "5 minutos". */
export const textoAnticipacion = (minutos) => (minutos === 60 ? "una hora" : `${minutos} minutos`);

const CLAVE = (turnoId) => `recordatorio:${turnoId}`;

/** Ya se activó (o se descartó) el aviso de este turno en este dispositivo. */
export const recordatorioResuelto = (turnoId) => {
  try {
    return Boolean(window.localStorage.getItem(CLAVE(turnoId)));
  } catch {
    return false;
  }
};

export const marcarRecordatorio = (turnoId, valor) => {
  try {
    window.localStorage.setItem(CLAVE(turnoId), valor);
  } catch {
    /* almacenamiento bloqueado: a lo sumo se vuelve a ofrecer */
  }
};
