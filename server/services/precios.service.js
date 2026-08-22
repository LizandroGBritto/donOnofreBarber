const ServicioModel = require("../models/servicio.model");
const PrecioBarberoModel = require("../models/precioBarbero.model");

/**
 * Único lugar del sistema que decide cuánto cuesta un servicio con un barbero.
 *
 * Regla de resolución:
 *   sin override           -> precio global de Servicio
 *   override con activo    -> precio del override
 *   override sin activo    -> el barbero no ofrece ese servicio
 *
 * Ningún precio puede venir del cliente. Antes `reservarTurnoConBarbero`
 * sumaba el `precio` que llegaba en el body, así que se podía reservar un
 * servicio de ₲80.000 por ₲0. Con precios por barbero eso además sería
 * inaplicable: el cliente podría mandar el precio del barbero más barato.
 */

// `Servicio` no tiene campo `duracion`, pero el snapshot embebido en `Agenda`
// sí lo guarda. Hasta que exista en el catálogo se usa este valor.
const DURACION_POR_DEFECTO_MIN = 30;

class ErrorServicioInvalido extends Error {
  constructor(mensaje, detalles = {}) {
    super(mensaje);
    this.name = "ErrorServicioInvalido";
    this.detalles = detalles;
  }
}

/** Overrides de un barbero, indexados por id de servicio. */
async function overridesDe(barberoId) {
  const filas = await PrecioBarberoModel.find({ barbero: barberoId }).lean();
  return new Map(filas.map((f) => [String(f.servicio), f]));
}

/**
 * Catálogo resuelto para un barbero: lo que la landing debe mostrar cuando ese
 * barbero está seleccionado. Excluye los que el barbero desactivó.
 */
async function listarServiciosDeBarbero(barberoId) {
  const [servicios, overrides] = await Promise.all([
    ServicioModel.find({ activo: true }).sort({ nombre: 1 }).lean(),
    overridesDe(barberoId),
  ]);

  return servicios
    .map((servicio) => {
      const override = overrides.get(String(servicio._id));
      if (override && !override.activo) return null;

      return {
        _id: servicio._id,
        nombre: servicio.nombre,
        descripcion: servicio.descripcion,
        // `|| []` no es defensivo de más: estas consultas usan .lean(), que NO
        // aplica los defaults del schema. Un servicio guardado sin el campo
        // `imagenes` vuelve como undefined y rompe el carrusel del cliente.
        imagenes: servicio.imagenes || [],
        precio: override ? override.precio : servicio.precio,
        precioGlobal: servicio.precio,
        personalizado: Boolean(override),
        duracion: DURACION_POR_DEFECTO_MIN,
      };
    })
    .filter(Boolean);
}

/**
 * Vista para el panel del barbero: TODOS los servicios activos del catálogo,
 * marcando cuáles personalizó y cuáles desactivó. A diferencia de
 * `listarServiciosDeBarbero`, acá sí aparecen los desactivados — el barbero
 * necesita verlos para poder volver a activarlos.
 */
async function listarPreciosDeBarbero(barberoId) {
  const [servicios, overrides] = await Promise.all([
    ServicioModel.find({ activo: true }).sort({ nombre: 1 }).lean(),
    overridesDe(barberoId),
  ]);

  return servicios.map((servicio) => {
    const override = overrides.get(String(servicio._id));
    return {
      servicioId: servicio._id,
      nombre: servicio.nombre,
      precioGlobal: servicio.precio,
      precio: override ? override.precio : servicio.precio,
      personalizado: Boolean(override),
      activo: override ? override.activo : true,
    };
  });
}

/**
 * Aplica los cambios de precios de un barbero.
 *
 * `cambios`: [{ servicioId, precio, activo }]
 *   - `precio: null` borra el override (vuelve al precio del local)
 *   - se ignoran los servicioId que no existan en el catálogo
 */
async function guardarPreciosDeBarbero(barberoId, cambios = []) {
  if (!Array.isArray(cambios)) {
    throw new ErrorServicioInvalido("Se esperaba una lista de precios");
  }

  const idsPedidos = cambios.map((c) => c.servicioId).filter(Boolean);
  const existentes = await ServicioModel.find({ _id: { $in: idsPedidos } })
    .select("_id")
    .lean();
  const validos = new Set(existentes.map((s) => String(s._id)));

  const operaciones = [];
  const ignorados = [];

  for (const cambio of cambios) {
    const servicioId = String(cambio.servicioId || "");

    if (!validos.has(servicioId)) {
      ignorados.push(servicioId);
      continue;
    }

    // precio null/vacío => quitar la personalización.
    if (cambio.precio === null || cambio.precio === undefined || cambio.precio === "") {
      operaciones.push({
        deleteOne: { filter: { barbero: barberoId, servicio: servicioId } },
      });
      continue;
    }

    const precio = Number(cambio.precio);
    if (!Number.isFinite(precio) || precio < 0) {
      throw new ErrorServicioInvalido(
        `Precio inválido para el servicio ${servicioId}`
      );
    }

    operaciones.push({
      updateOne: {
        filter: { barbero: barberoId, servicio: servicioId },
        update: {
          $set: {
            precio,
            activo: cambio.activo !== undefined ? Boolean(cambio.activo) : true,
          },
        },
        upsert: true,
      },
    });
  }

  if (operaciones.length > 0) {
    await PrecioBarberoModel.bulkWrite(operaciones);
  }

  return { aplicados: operaciones.length, ignorados };
}

/**
 * Resuelve los servicios de una reserva contra la base y devuelve el snapshot
 * que se guarda embebido en el turno, más el costo total.
 *
 * Acepta ids sueltos o el formato viejo `[{servicioId}]` (ver compatibilidad en
 * el controller). Cualquier `precio` o `nombre` que venga del cliente se
 * descarta.
 */
async function resolverServiciosParaReserva(barberoId, servicioIds = []) {
  const ids = servicioIds
    .map((s) => (typeof s === "string" ? s : s?.servicioId || s?._id))
    .filter(Boolean)
    .map(String);

  if (ids.length === 0) {
    return { servicios: [], costoTotal: 0 };
  }

  const [servicios, overrides] = await Promise.all([
    ServicioModel.find({ _id: { $in: ids }, activo: true }).lean(),
    overridesDe(barberoId),
  ]);

  const encontrados = new Map(servicios.map((s) => [String(s._id), s]));

  const inexistentes = ids.filter((id) => !encontrados.has(id));
  if (inexistentes.length > 0) {
    throw new ErrorServicioInvalido(
      "Alguno de los servicios seleccionados no existe o está inactivo",
      { servicios: inexistentes }
    );
  }

  const noOfrecidos = ids.filter((id) => {
    const override = overrides.get(id);
    return override && !override.activo;
  });
  if (noOfrecidos.length > 0) {
    throw new ErrorServicioInvalido(
      "Este barbero no ofrece alguno de los servicios seleccionados",
      { servicios: noOfrecidos }
    );
  }

  // Se recorre `ids` y no `servicios` para respetar el orden que eligió el
  // cliente y para no duplicar si mandó el mismo id dos veces.
  const vistos = new Set();
  const snapshot = [];

  for (const id of ids) {
    if (vistos.has(id)) continue;
    vistos.add(id);

    const servicio = encontrados.get(id);
    const override = overrides.get(id);

    snapshot.push({
      servicioId: servicio._id,
      nombre: servicio.nombre,
      precio: override ? override.precio : servicio.precio,
      duracion: DURACION_POR_DEFECTO_MIN,
    });
  }

  const costoTotal = snapshot.reduce((total, s) => total + (s.precio || 0), 0);

  return { servicios: snapshot, costoTotal };
}

/** Borra los overrides de un servicio que dejó de existir o se desactivó. */
async function limpiarOverridesDeServicio(servicioId) {
  const resultado = await PrecioBarberoModel.deleteMany({
    servicio: servicioId,
  });
  return resultado.deletedCount;
}

module.exports = {
  DURACION_POR_DEFECTO_MIN,
  ErrorServicioInvalido,
  listarServiciosDeBarbero,
  listarPreciosDeBarbero,
  guardarPreciosDeBarbero,
  resolverServiciosParaReserva,
  limpiarOverridesDeServicio,
};
