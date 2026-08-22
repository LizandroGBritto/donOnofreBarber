const AgendaModel = require("../models/agenda.model");

/**
 * Deja pasar si es admin, o si el turno de `req.params.id` pertenece al
 * barbero del usuario logueado.
 *
 * Existe porque un barbero necesita operar sobre sus propios turnos (marcarlos
 * pagados, completados, liberarlos) pero no sobre los de otro. La verificación
 * no puede hacerse con `requireBarberoPropio`: ahí el id del barbero viene en
 * la URL, mientras que acá hay que ir a buscarlo al turno.
 *
 * Usar siempre después de `authenticate`.
 */
const requireTurnoPropio = async (req, res, next) => {
  if (req.user?.rol === "admin") return next();

  if (!req.user?.barbero) {
    return res
      .status(403)
      .json({ msg: "Tu usuario no tiene un barbero asignado" });
  }

  try {
    const turno = await AgendaModel.findById(req.params.id)
      .select("barbero")
      .lean();

    if (!turno) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }

    if (String(turno.barbero) !== String(req.user.barbero)) {
      return res
        .status(403)
        .json({ msg: "Solo podés gestionar tus propios turnos" });
    }

    next();
  } catch (error) {
    // id con formato inválido u otro fallo de lectura.
    return res.status(404).json({ message: "Turno no encontrado" });
  }
};

module.exports = { requireTurnoPropio };
