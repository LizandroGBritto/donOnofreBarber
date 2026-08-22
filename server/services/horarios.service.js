const HorarioModel = require("../models/horario.model");
const BarberoModel = require("../models/barbero.model");

/**
 * Único lugar que decide qué horarios rigen para un barbero.
 *
 * Regla (semántica de REEMPLAZO, no de suma):
 *   usaHorariosPropios === false -> los horarios del local (barbero: null)
 *   usaHorariosPropios === true  -> exclusivamente los suyos
 *
 * Se eligió reemplazo y no suma porque, sumando, un barbero nunca podría
 * SACARSE una hora en la que no trabaja — que es el caso real (alguien que
 * arranca 13:00 cuando el local abre 09:00). Para que reemplazar no obligue a
 * recargar todo a mano, la personalización arranca clonando los del local
 * (ver `clonarHorariosGlobales`).
 */

class ErrorHorario extends Error {
  constructor(mensaje, detalles = {}) {
    super(mensaje);
    this.name = "ErrorHorario";
    this.detalles = detalles;
  }
}

/** Horarios activos del local. */
function horariosDelLocal(diaSemana = null) {
  const filtro = { barbero: null, estado: "activo" };
  if (diaSemana) filtro.dias = diaSemana;
  return HorarioModel.find(filtro).sort({ hora: 1 }).lean();
}

/**
 * Horarios que rigen para un barbero. `barbero` puede ser el documento (para
 * evitar una query extra) o su id.
 */
async function resolverHorariosDeBarbero(barbero, diaSemana = null) {
  const doc =
    barbero && barbero.usaHorariosPropios !== undefined
      ? barbero
      : await BarberoModel.findById(barbero).lean();

  if (!doc) return [];

  if (!doc.usaHorariosPropios) {
    return horariosDelLocal(diaSemana);
  }

  const filtro = { barbero: doc._id, estado: "activo" };
  if (diaSemana) filtro.dias = diaSemana;
  return HorarioModel.find(filtro).sort({ hora: 1 }).lean();
}

/**
 * Unión de los horarios de todos los barberos activos. La usa la landing
 * cuando todavía no hay un barbero seleccionado, para armar el eje de la
 * grilla sin dejar afuera las horas propias de alguno.
 */
async function resolverHorariosDeTodos() {
  const barberos = await BarberoModel.find({
    activo: true,
    incluirEnAgenda: true,
  }).lean();

  const porHora = new Map();

  for (const barbero of barberos) {
    const horarios = await resolverHorariosDeBarbero(barbero);
    for (const horario of horarios) {
      const previo = porHora.get(horario.hora);
      if (previo) {
        // Misma hora en varios barberos: se unen los días.
        previo.dias = [...new Set([...previo.dias, ...(horario.dias || [])])];
      } else {
        porHora.set(horario.hora, {
          hora: horario.hora,
          dias: [...(horario.dias || [])],
        });
      }
    }
  }

  return [...porHora.values()].sort((a, b) => a.hora.localeCompare(b.hora));
}

/**
 * Copia los horarios del local como horarios propios del barbero y prende el
 * flag. Es el arranque de la personalización.
 *
 * Idempotente: si ya tiene propios, no los duplica ni los pisa.
 */
async function clonarHorariosGlobales(barberoId) {
  const barbero = await BarberoModel.findById(barberoId);
  if (!barbero) {
    throw new ErrorHorario("Barbero no encontrado");
  }

  const yaTiene = await HorarioModel.countDocuments({ barbero: barberoId });

  let clonados = 0;
  if (yaTiene === 0) {
    const globales = await horariosDelLocal();
    if (globales.length > 0) {
      await HorarioModel.insertMany(
        globales.map((h) => ({
          barbero: barberoId,
          hora: h.hora,
          dias: [...(h.dias || [])],
          estado: h.estado,
        }))
      );
      clonados = globales.length;
    }
  }

  barbero.usaHorariosPropios = true;
  await barbero.save();

  return { clonados, yaTenia: yaTiene };
}

/**
 * Vuelve a usar los horarios del local. NO borra los propios: quedan
 * guardados por si el barbero quiere retomarlos.
 */
async function volverAHorariosGlobales(barberoId) {
  const barbero = await BarberoModel.findById(barberoId);
  if (!barbero) {
    throw new ErrorHorario("Barbero no encontrado");
  }

  barbero.usaHorariosPropios = false;
  await barbero.save();

  return { usaHorariosPropios: false };
}

module.exports = {
  ErrorHorario,
  horariosDelLocal,
  resolverHorariosDeBarbero,
  resolverHorariosDeTodos,
  clonarHorariosGlobales,
  volverAHorariosGlobales,
};
