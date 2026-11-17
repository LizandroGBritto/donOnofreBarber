import ParaguayDateUtil from "../../utils/paraguayDate";

/**
 * Agenda de un barbero tal como la muestra la reserva: días con sus turnos.
 *
 * Todo cálculo de fecha va en hora de Asunción (ParaguayDateUtil) y recibe el
 * "ahora" como parámetro, para que sea testeable y no dependa de la zona
 * horaria del teléfono del cliente.
 */

export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Días que muestra el selector, como en la demo: dos semanas con turnos. */
export const DIAS_VISIBLES = 14;

export const ESTADO = Object.freeze({
  LIBRE: "libre",
  OCUPADO: "ocupado",
  PROPIO: "propio",
  PASADO: "pasado",
});

const aHoraParaguay = (fecha) => ParaguayDateUtil.toParaguayTime(fecha);

/** Momento exacto del turno: su fecha (día en Asunción) más su hora "HH:MM". */
export const momentoDelTurno = (turno) => {
  const [h, m] = String(turno.hora).split(":").map(Number);
  return aHoraParaguay(turno.fecha)
    .clone()
    .startOf("day")
    .hour(h || 0)
    .minute(m || 0)
    .second(0)
    .millisecond(0);
};

/**
 * - pasado: ya empezó (se oculta).
 * - propio: lo reservó este dispositivo (tiene su token guardado).
 * - libre / ocupado: según el estado del servidor.
 */
export const estadoDelTurno = (turno, ahora, idsPropios = new Set()) => {
  if (!momentoDelTurno(turno).isAfter(ahora)) return ESTADO.PASADO;
  if (turno.estado === "disponible") return ESTADO.LIBRE;
  if (idsPropios.has(String(turno._id))) return ESTADO.PROPIO;
  return ESTADO.OCUPADO;
};

const ordenarPorHora = (a, b) => a.hora.localeCompare(b.hora);

/**
 * Agrupa los turnos por día y descarta los que ya pasaron.
 *
 * Devuelve hasta `DIAS_VISIBLES` días, en orden, solo los que tienen al menos
 * un turno por delante (libre, ocupado o propio). Cada día:
 * `{ clave: "YYYY-MM-DD", fecha, turnos: [{ ...turno, estadoVista }], libres }`.
 */
export const armarDias = (turnos = [], ahora, idsPropios = new Set()) => {
  const porDia = new Map();

  for (const turno of turnos) {
    const estadoVista = estadoDelTurno(turno, ahora, idsPropios);
    if (estadoVista === ESTADO.PASADO) continue;

    const fecha = aHoraParaguay(turno.fecha).clone().startOf("day");
    const clave = fecha.format("YYYY-MM-DD");
    if (!porDia.has(clave)) porDia.set(clave, { clave, fecha, turnos: [] });

    const dia = porDia.get(clave);
    // Un mismo barbero no debería tener dos turnos a la misma hora; si el
    // generador dejó un duplicado, se muestra una sola vez y gana el libre.
    const repetido = dia.turnos.find((t) => t.hora === turno.hora);
    if (repetido) {
      if (repetido.estadoVista !== ESTADO.LIBRE && estadoVista === ESTADO.LIBRE) {
        dia.turnos[dia.turnos.indexOf(repetido)] = { ...turno, estadoVista };
      }
      continue;
    }
    dia.turnos.push({ ...turno, estadoVista });
  }

  return [...porDia.values()]
    .sort((a, b) => a.clave.localeCompare(b.clave))
    .slice(0, DIAS_VISIBLES)
    .map((dia) => {
      const ordenados = [...dia.turnos].sort(ordenarPorHora);
      return {
        ...dia,
        turnos: ordenados,
        libres: ordenados.filter((t) => t.estadoVista === ESTADO.LIBRE).length,
      };
    });
};

/** Primer `{ dia, turno }` libre, o null. */
export const proximoLibre = (dias = []) => {
  for (const dia of dias) {
    const turno = dia.turnos.find((t) => t.estadoVista === ESTADO.LIBRE);
    if (turno) return { dia, turno };
  }
  return null;
};

/** Clave del primer día con algo libre; si no hay, la del primer día. */
export const primerDiaConLibres = (dias = []) =>
  (dias.find((d) => d.libres > 0) || dias[0])?.clave ?? null;

/** Siguiente día (después de `clave`) con turnos libres, o null. */
export const siguienteDiaConLibres = (dias = [], clave) => {
  const desde = dias.findIndex((d) => d.clave === clave);
  return dias.slice(desde + 1).find((d) => d.libres > 0) || null;
};

const mismaFecha = (a, b) => a.format("YYYY-MM-DD") === b.format("YYYY-MM-DD");

/** "Hoy", "Mañana" o "Mar 18". */
export const etiquetaCorta = (fecha, ahora) => {
  const dia = aHoraParaguay(fecha);
  if (mismaFecha(dia, ahora)) return "Hoy";
  if (mismaFecha(dia, ahora.clone().add(1, "day"))) return "Mañana";
  return `${DIAS_CORTOS[dia.day()]} ${dia.date()}`;
};

/** "hoy", "mañana" o "el martes 18", para meter en una oración. */
export const etiquetaEnOracion = (fecha, ahora) => {
  const dia = aHoraParaguay(fecha);
  if (mismaFecha(dia, ahora)) return "hoy";
  if (mismaFecha(dia, ahora.clone().add(1, "day"))) return "mañana";
  return `el ${DIAS_LARGOS[dia.day()].toLowerCase()} ${dia.date()}`;
};

/** "Martes 18 de noviembre". */
export const fechaLarga = (fecha) => {
  const dia = aHoraParaguay(fecha);
  return `${DIAS_LARGOS[dia.day()]} ${dia.date()} de ${MESES[dia.month()]}`;
};

/**
 * El turno libre más cercano entre varios barberos.
 * `agendas`: `[{ barbero, dias }]`. Devuelve `{ barbero, dia, turno }` o null.
 */
export const proximoLibreEntre = (agendas = []) => {
  let mejor = null;
  for (const { barbero, dias } of agendas) {
    const libre = proximoLibre(dias);
    if (!libre) continue;
    const momento = momentoDelTurno(libre.turno);
    if (!mejor || momento.isBefore(mejor.momento)) {
      mejor = { barbero, ...libre, momento };
    }
  }
  return mejor;
};
