/**
 * Índice único de turnos: un barbero, un día, una hora.
 *
 * El modelo declara `turno_unico_por_barbero` y Mongoose lo crea solo al
 * arrancar. Pero si la base ya tiene dos turnos del mismo barbero el mismo día
 * a la misma hora, MongoDB no lo puede crear y la doble reserva sigue siendo
 * posible. Este script:
 *
 *   1. Lista los grupos duplicados (sin tocarlos).
 *   2. Con --ejecutar y sin duplicados, crea el índice.
 *
 * NUNCA borra turnos: cuál de los duplicados sobra (uno puede tener un cliente)
 * lo decide una persona desde el panel. Es idempotente.
 *
 * USO:
 *   node scripts/indiceTurnoUnico.js            # diagnóstico, no escribe
 *   node scripts/indiceTurnoUnico.js --ejecutar # crea el índice si se puede
 */
require("dotenv").config();
const mongoose = require("mongoose");

const AgendaModel = require("../models/agenda.model");

const NOMBRE_INDICE = "turno_unico_por_barbero";

/** Grupos `{ barbero, fecha, hora, turnos: [{ _id, estado, nombreCliente }] }` con más de un turno. */
async function buscarDuplicados() {
  const grupos = await AgendaModel.aggregate([
    { $match: { barbero: { $type: "objectId" } } },
    {
      $group: {
        _id: { barbero: "$barbero", fecha: "$fecha", hora: "$hora" },
        turnos: { $push: { _id: "$_id", estado: "$estado", nombreCliente: "$nombreCliente" } },
        cantidad: { $sum: 1 },
      },
    },
    { $match: { cantidad: { $gt: 1 } } },
    { $sort: { "_id.fecha": 1, "_id.hora": 1 } },
  ]);
  return grupos.map((g) => ({ ...g._id, turnos: g.turnos }));
}

async function indiceExiste() {
  const indices = await AgendaModel.collection.indexes();
  return indices.some((i) => i.name === NOMBRE_INDICE);
}

async function revisar({ ejecutar }) {
  if (await indiceExiste()) {
    console.log(`El índice ${NOMBRE_INDICE} ya existe. Nada que hacer.`);
    return { creado: false, duplicados: [] };
  }

  const duplicados = await buscarDuplicados();
  if (duplicados.length) {
    console.log(`${duplicados.length} horarios con más de un turno del mismo barbero:\n`);
    for (const d of duplicados) {
      const dia = d.fecha instanceof Date ? d.fecha.toISOString().slice(0, 10) : d.fecha;
      console.log(`- barbero ${d.barbero}, ${dia} ${d.hora}`);
      for (const t of d.turnos) {
        // Solo si tiene cliente, para decidir cuál conservar; sin el celular.
        console.log(`    ${t._id}  ${t.estado}${t.nombreCliente ? "  (con cliente)" : ""}`);
      }
    }
    console.log("\nResolvelos desde el panel y volvé a correr el script. No se creó el índice.");
    return { creado: false, duplicados };
  }

  if (!ejecutar) {
    console.log("Sin duplicados. Volvé a correrlo con --ejecutar para crear el índice.");
    return { creado: false, duplicados };
  }

  // createIndexes solo crea los índices declarados que falten. No usar
  // syncIndexes: borra los índices de la base que el schema no declara.
  await AgendaModel.createIndexes();
  console.log(`Índice ${NOMBRE_INDICE} creado.`);
  return { creado: true, duplicados };
}

async function main() {
  const ejecutar = process.argv.includes("--ejecutar");
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/OnofreDb";

  // Sin autoIndex: el script decide cuándo crear el índice, no el connect.
  await mongoose.connect(uri, { autoIndex: false });
  console.log(`Conectado a ${uri.replace(/\/\/[^@]*@/, "//<oculto>@")}\n`);

  try {
    await revisar({ ejecutar });
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Falló la revisión del índice:", error);
    process.exit(1);
  });
}

module.exports = { revisar, buscarDuplicados, NOMBRE_INDICE };
