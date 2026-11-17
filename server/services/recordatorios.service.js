/**
 * Todo lo que depende del momento exacto de un turno: la regla de un turno
 * abierto por celular, los recordatorios por WhatsApp y los avisos push.
 *
 * `fecha` en Agenda es el INICIO del día en Asunción, no el momento del turno.
 * Antes se comparaba `fecha` contra "ahora + N horas" y salía mal: la regla de
 * 12 horas no veía los turnos de hoy y los recordatorios de un día entero se
 * mandaban cerca de las 23:00 de la noche anterior. Acá el momento siempre es
 * fecha + hora.
 *
 * Las funciones reciben `ahora` (moment en hora de Asunción) para poder
 * probarlas sin depender del reloj.
 */
const crypto = require("crypto");
const AgendaModel = require("../models/agenda.model");
const RecordatorioPush = require("../models/recordatorioPush.model");
const ParaguayDateUtil = require("../utils/paraguayDate");

const ESTADOS_ABIERTOS = ["reservado", "confirmado"];
const HORAS_TURNO_ABIERTO = 12;
// Anticipaciones posibles del aviso push, de la mayor a la menor. Con 5
// minutos o menos por delante ya no se ofrece.
const AVISOS_MINUTOS = [60, 40, 20, 5];
const MINUTOS_RECORDATORIO_WHATSAPP = 60;
const MAX_AVISOS_POR_TURNO = 3;
const MAX_INTENTOS_PUSH = 3;

/** Momento del turno: el día (en Asunción) a la hora "HH:MM". */
const momentoDelTurno = (turno) => {
  const [h, m] = String(turno.hora).split(":").map(Number);
  return ParaguayDateUtil.startOfDay(turno.fecha)
    .hour(h || 0)
    .minute(m || 0)
    .second(0)
    .millisecond(0);
};

const minutosHasta = (momento, ahora) => momento.diff(ahora, "seconds") / 60;

/**
 * Con cuántos minutos de anticipación avisar: la mayor de AVISOS_MINUTOS que
 * todavía queda por delante. null si faltan 5 minutos o menos.
 */
const minutosDeAviso = (minutosRestantes) =>
  AVISOS_MINUTOS.find((m) => minutosRestantes > m) ?? null;

/** "09XXXXXXXX" a partir de lo que se haya guardado o escrito. */
const normalizarCelular = (valor = "") => {
  const digitos = String(valor).replace(/\D/g, "");
  return digitos.startsWith("595") && digitos.length === 12 ? `0${digitos.slice(3)}` : digitos;
};

/** Hash del editToken: identifica la reserva sin guardar el token. */
const huellaDeReserva = (editToken) =>
  crypto.createHash("sha256").update(String(editToken)).digest("hex");

/**
 * El turno abierto (reservado) de ese celular que empieza entre ahora y
 * las próximas 12 horas, o null.
 */
const turnoAbiertoDelCelular = async (numeroCliente, ahora = ParaguayDateUtil.now()) => {
  const normalizado = normalizarCelular(numeroCliente);
  if (!normalizado) return null;
  const limite = ahora.clone().add(HORAS_TURNO_ABIERTO, "hours");

  const candidatos = await AgendaModel.find({
    numeroCliente: { $in: [...new Set([normalizado, String(numeroCliente)])] },
    estado: { $in: ESTADOS_ABIERTOS },
    // `fecha` es el inicio del día: desde hoy hasta el día en que cae el límite.
    fecha: { $gte: ParaguayDateUtil.startOfDay(ahora).toDate(), $lte: limite.toDate() },
  }).populate("barbero", "nombre");

  return (
    candidatos
      .map((turno) => ({ turno, momento: momentoDelTurno(turno) }))
      .filter(({ momento }) => momento.isAfter(ahora) && !momento.isAfter(limite))
      .sort((a, b) => a.momento.diff(b.momento))[0]?.turno || null
  );
};

/**
 * Recordatorio por WhatsApp una hora antes. Se manda cuando falta una hora o
 * menos, una sola vez, y solo a turnos reservados con más de una hora de
 * anticipación (al que reservó hace 10 minutos le alcanza la confirmación).
 */
const enviarRecordatoriosWhatsapp = async ({ ahora = ParaguayDateUtil.now(), enviar }) => {
  const limite = ahora.clone().add(MINUTOS_RECORDATORIO_WHATSAPP, "minutes");
  const candidatos = await AgendaModel.find({
    estado: { $in: ESTADOS_ABIERTOS },
    numeroCliente: { $exists: true, $ne: "" },
    $or: [{ recordatorioEnviado: false }, { recordatorioEnviado: { $exists: false } }],
    fecha: { $gte: ParaguayDateUtil.startOfDay(ahora).toDate(), $lte: limite.toDate() },
  }).populate("barbero", "nombre");

  let enviados = 0;
  for (const turno of candidatos) {
    const momento = momentoDelTurno(turno);
    const restantes = minutosHasta(momento, ahora);
    if (restantes <= 0 || restantes > MINUTOS_RECORDATORIO_WHATSAPP) continue;
    const reservadoEn = turno.fechaReserva ? ParaguayDateUtil.toParaguayTime(turno.fechaReserva) : null;
    if (reservadoEn && minutosHasta(momento, reservadoEn) <= MINUTOS_RECORDATORIO_WHATSAPP) continue;

    const nombreCliente = turno.nombreCliente || "Cliente";
    const nombreBarbero = turno.barbero?.nombre || turno.nombreBarbero || "tu barbero";
    const mensaje =
      `Hola ${nombreCliente}! 👋\n\nTe recordamos que tenés un turno hoy a las *${turno.hora}* ` +
      `con *${nombreBarbero}* en Alonzo Style.\n\nTe esperamos! 💈`;

    try {
      await enviar(turno.numeroCliente, mensaje);
    } catch (error) {
      // Sin WhatsApp (Evolution caído) no se reintenta en loop: se marca igual
      // para no mandar el recordatorio tarde, cuando ya no sirve.
      console.error(`Recordatorio de WhatsApp fallido (turno ${turno._id}):`, error.message);
    }
    turno.recordatorioEnviado = true;
    await turno.save();
    enviados += 1;
  }
  return enviados;
};

/** Texto de cuánto falta: "1 hora", "40 minutos". */
const textoDeTiempo = (minutos) => {
  if (minutos >= 55) return "1 hora";
  const redondeado = Math.max(1, Math.round(minutos));
  return `${redondeado} ${redondeado === 1 ? "minuto" : "minutos"}`;
};

/**
 * Manda los avisos push que ya entraron en su ventana. Descarta los de
 * turnos liberados, re-reservados por otra persona o que ya empezaron.
 */
const enviarRecordatoriosPush = async ({ ahora = ParaguayDateUtil.now(), enviar }) => {
  const pendientes = await RecordatorioPush.find({ estado: "pendiente" }).populate({
    path: "turno",
    populate: { path: "barbero", select: "nombre" },
  });

  const descartar = (aviso, motivo) => {
    aviso.estado = "descartado";
    aviso.motivo = motivo;
    return aviso.save();
  };

  let enviados = 0;
  for (const aviso of pendientes) {
    const turno = aviso.turno;
    if (!turno || !ESTADOS_ABIERTOS.includes(turno.estado)) {
      await descartar(aviso, "turno liberado");
      continue;
    }
    if (!turno.editToken || huellaDeReserva(turno.editToken) !== aviso.reserva) {
      await descartar(aviso, "turno de otra reserva");
      continue;
    }
    const restantes = minutosHasta(momentoDelTurno(turno), ahora);
    if (restantes <= 0) {
      await descartar(aviso, "el turno ya empezó");
      continue;
    }
    if (restantes > aviso.minutosAntes) continue;

    const barbero = turno.barbero?.nombre || turno.nombreBarbero;
    const payload = {
      title: `Tu turno es en ${textoDeTiempo(restantes)}`,
      body: `A las ${turno.hora}${barbero ? ` con ${barbero}` : ""} en Alonzo Style.`,
      icon: "/AlonzoStylev2.webp",
      badge: "/AlonzoStylev2.webp",
      tag: `turno-${turno._id}`,
      requireInteraction: true,
      data: { type: "recordatorio_turno", url: `/editar-turno/${turno._id}` },
    };

    try {
      await enviar({ endpoint: aviso.endpoint, keys: aviso.keys }, JSON.stringify(payload));
      aviso.estado = "enviado";
      aviso.enviadoEn = ahora.toDate();
      await aviso.save();
      enviados += 1;
    } catch (error) {
      // 404/410: el navegador dio de baja la suscripción.
      if (error.statusCode === 404 || error.statusCode === 410) {
        await descartar(aviso, "suscripción vencida");
      } else {
        aviso.intentos += 1;
        if (aviso.intentos >= MAX_INTENTOS_PUSH) await descartar(aviso, error.message);
        else await aviso.save();
      }
    }
  }
  return enviados;
};

// Servicios de push de los navegadores. El servidor hace un POST al
// `endpoint` que manda el cliente: sin esta lista, cualquiera podría hacerle
// pedir URLs internas (Evolution, Mongo, la red de la VPS).
const HOSTS_PUSH = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
  /\.push\.apple\.com$/,
];

const endpointPushValido = (endpoint) => {
  if (typeof endpoint !== "string" || endpoint.length > 1000) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && HOSTS_PUSH.some((patron) => patron.test(url.hostname));
  } catch {
    return false;
  }
};

module.exports = {
  AVISOS_MINUTOS,
  MAX_AVISOS_POR_TURNO,
  ESTADOS_ABIERTOS,
  momentoDelTurno,
  minutosHasta,
  minutosDeAviso,
  normalizarCelular,
  huellaDeReserva,
  turnoAbiertoDelCelular,
  enviarRecordatoriosWhatsapp,
  enviarRecordatoriosPush,
  endpointPushValido,
  textoDeTiempo,
};
