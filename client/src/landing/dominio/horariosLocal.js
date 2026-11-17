/**
 * Horarios del local para el bloque "Dónde y cuándo" y para saber si está
 * abierto (lo que hace girar el poste del encabezado).
 *
 * Salen de los `Horario` del local (los de `barbero: null`), que son las
 * horas de inicio de los turnos. El cierre de cada día se toma como el último
 * turno más el intervalo entre turnos: con turnos de 09:00 a 19:00 cada hora,
 * el día va de 09:00 a 20:00.
 */

// Índice = día de la semana de moment/Date (0 = domingo).
const CLAVES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const NOMBRES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
// Orden de lectura: la semana empieza el lunes.
const ORDEN = [1, 2, 3, 4, 5, 6, 0];
const INTERVALO_POR_DEFECTO_MIN = 60;

const aMinutos = (hora) => {
  const [h, m] = String(hora).split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};
const aHora = (minutos) =>
  `${String(Math.floor(minutos / 60) % 24).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

/** Menor diferencia entre turnos consecutivos de un mismo día. */
const intervaloEntreTurnos = (minutosPorDia) => {
  let menor = Infinity;
  for (const lista of minutosPorDia) {
    for (let i = 1; i < lista.length; i++) {
      menor = Math.min(menor, lista[i] - lista[i - 1]);
    }
  }
  return Number.isFinite(menor) && menor > 0 ? menor : INTERVALO_POR_DEFECTO_MIN;
};

/**
 * `[{ dia: 0..6, abre: minutos, cierra: minutos } | { dia, cerrado: true }]`
 * para los siete días.
 */
export const jornadas = (horarios = []) => {
  const minutos = CLAVES.map(() => []);
  for (const h of horarios) {
    if (h.estado && h.estado !== "activo") continue;
    const m = aMinutos(h.hora);
    if (m === null) continue;
    for (const dia of h.dias || []) {
      const i = CLAVES.indexOf(dia);
      if (i >= 0 && !minutos[i].includes(m)) minutos[i].push(m);
    }
  }
  minutos.forEach((lista) => lista.sort((a, b) => a - b));
  const intervalo = intervaloEntreTurnos(minutos);

  return minutos.map((lista, dia) =>
    lista.length
      ? { dia, abre: lista[0], cierra: lista[lista.length - 1] + intervalo }
      : { dia, cerrado: true }
  );
};

const rangoDe = (j) => (j.cerrado ? "Cerrado" : `${aHora(j.abre)} a ${aHora(j.cierra)}`);

const nombreGrupo = (dias) => {
  const primero = NOMBRES[dias[0]];
  if (dias.length === 1) return primero;
  const ultimo = NOMBRES[dias[dias.length - 1]].toLowerCase();
  return dias.length === 2 ? `${primero} y ${ultimo}` : `${primero} a ${ultimo}`;
};

/**
 * Filas para mostrar, agrupando días seguidos con el mismo horario:
 * `[{ clave, etiqueta: "Martes a sábado", rango: "09:00 a 20:00", dias: [2..6] }]`.
 * Sin ningún horario cargado devuelve `[]` (el bloque no se muestra).
 */
export const resumirHorarios = (horarios = []) => {
  const porDia = jornadas(horarios);
  if (porDia.every((j) => j.cerrado)) return [];

  const filas = [];
  for (const dia of ORDEN) {
    const rango = rangoDe(porDia[dia]);
    const anterior = filas[filas.length - 1];
    if (anterior && anterior.rango === rango) anterior.dias.push(dia);
    else filas.push({ rango, dias: [dia] });
  }
  return filas.map((f) => ({
    ...f,
    clave: f.dias.join("-"),
    etiqueta: nombreGrupo(f.dias),
  }));
};

/**
 * `{ abierto, texto }` para un momento dado (moment en hora de Asunción).
 * Textos: "Abierto hasta las 20:00", "Abre hoy a las 09:00",
 * "Abre mañana a las 14:00", "Abre el lunes a las 14:00", "Cerrado".
 */
export const estadoApertura = (horarios = [], ahora) => {
  const porDia = jornadas(horarios);
  const hoy = ahora.day();
  const minutoActual = ahora.hours() * 60 + ahora.minutes();
  const jHoy = porDia[hoy];

  if (!jHoy.cerrado && minutoActual >= jHoy.abre && minutoActual < jHoy.cierra) {
    return { abierto: true, texto: `Abierto hasta las ${aHora(jHoy.cierra)}` };
  }
  if (!jHoy.cerrado && minutoActual < jHoy.abre) {
    return { abierto: false, texto: `Abre hoy a las ${aHora(jHoy.abre)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const j = porDia[(hoy + i) % 7];
    if (j.cerrado) continue;
    const cuando = i === 1 ? "mañana" : `el ${NOMBRES[j.dia].toLowerCase()}`;
    return { abierto: false, texto: `Abre ${cuando} a las ${aHora(j.abre)}` };
  }
  return { abierto: false, texto: "Cerrado" };
};
