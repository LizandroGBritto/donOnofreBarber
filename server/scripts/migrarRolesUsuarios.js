/**
 * Migración: asigna `rol` y `barbero` a los usuarios existentes.
 *
 * Es IDEMPOTENTE: se puede correr las veces que haga falta.
 *
 * Qué hace:
 *   1. Todo usuario sin `rol` pasa a "admin". Deliberadamente conservador: no
 *      degrada a nadie. Que el admin baje a quien corresponda desde el panel.
 *   2. Vincula `barbero` cuando el userName normalizado coincide con el nombre
 *      normalizado de un barbero ("LisandroAlonzo" -> "Lisandro Alonzo").
 *      Si hay ambigüedad o el barbero ya tiene otro usuario, no adivina: avisa.
 *
 * IMPORTANTE — orden de despliegue: esto tiene que correr ANTES de que el nuevo
 * authenticate reciba tráfico. Mongoose aplica el default del schema al
 * hidratar, así que sin migrar, un usuario viejo se leería como "barbero" y
 * perdería el panel. (authenticate tiene además un fallback por las dudas.)
 *
 * USO:
 *   node scripts/migrarRolesUsuarios.js            # simulacro, no escribe
 *   node scripts/migrarRolesUsuarios.js --ejecutar # aplica los cambios
 *
 *   # Además, baja a "barbero" a los usuarios que quedaron vinculados a uno.
 *   # Es opt-in porque degradar a alguien le saca el panel de admin: tiene que
 *   # ser una decisión explícita, no un efecto colateral de migrar.
 *   node scripts/migrarRolesUsuarios.js --ejecutar --degradar-vinculados
 */
require("dotenv").config();
const mongoose = require("mongoose");

const { UserModel } = require("../models/user.model");
const BarberoModel = require("../models/barbero.model");

/** Quita tildes, espacios y mayúsculas para comparar "EliasLugo" con "Elias Lugo". */
const normalizar = (texto = "") =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

async function migrar({ ejecutar, degradarVinculados = false }) {
  // .lean() es obligatorio acá, no una optimización: con documentos hidratados
  // Mongoose rellena el default del schema (rol: "barbero") en los usuarios
  // que todavía no tienen el campo, y el `if (!usuario.rol)` de abajo nunca se
  // cumpliría — la migración no haría nada y los admin existentes quedarían
  // como barberos al primer login.
  const usuarios = await UserModel.find({})
    .select("_id userName rol barbero")
    .lean();
  const barberos = await BarberoModel.find({}).select("_id nombre").lean();

  console.log(
    `${usuarios.length} usuarios, ${barberos.length} barberos.` +
      (ejecutar ? "" : "  [SIMULACRO — no se escribe nada]")
  );
  console.log("");

  const porNombre = new Map();
  for (const b of barberos) {
    const clave = normalizar(b.nombre);
    // Dos barberos que normalizan igual: no se puede desambiguar por nombre.
    porNombre.set(clave, porNombre.has(clave) ? "AMBIGUO" : b);
  }

  // Barberos que ya tienen dueño, para no violar el índice único.
  const yaVinculados = new Map();
  for (const u of usuarios) {
    if (u.barbero) yaVinculados.set(String(u.barbero), u.userName);
  }

  let rolesAsignados = 0;
  let vinculos = 0;
  const avisos = [];

  for (const usuario of usuarios) {
    const cambios = {};

    if (!usuario.rol) {
      cambios.rol = "admin";
    }

    if (!usuario.barbero) {
      const candidato = porNombre.get(normalizar(usuario.userName));

      if (candidato === "AMBIGUO") {
        avisos.push(
          `  "${usuario.userName}": hay más de un barbero con ese nombre normalizado. Vinculalo a mano.`
        );
      } else if (candidato) {
        const dueño = yaVinculados.get(String(candidato._id));
        if (dueño) {
          avisos.push(
            `  "${usuario.userName}": el barbero "${candidato.nombre}" ya es de "${dueño}". Sin vincular.`
          );
        } else {
          cambios.barbero = candidato._id;
          yaVinculados.set(String(candidato._id), usuario.userName);
        }
      }
    }

    // El barbero que quedó vinculado (recién ahora o de una corrida anterior).
    const barberoFinal = cambios.barbero || usuario.barbero;
    if (degradarVinculados && barberoFinal && usuario.rol !== "barbero") {
      cambios.rol = "barbero";
    }

    if (Object.keys(cambios).length === 0) {
      console.log(
        `  = ${usuario.userName}: sin cambios (rol=${usuario.rol}, barbero=${usuario.barbero || "null"})`
      );
      continue;
    }

    const detalle = [
      cambios.rol ? `rol -> ${cambios.rol}` : null,
      cambios.barbero
        ? `barbero -> ${barberos.find((b) => String(b._id) === String(cambios.barbero)).nombre}`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    console.log(`  ${ejecutar ? "*" : "?"} ${usuario.userName}: ${detalle}`);

    if (cambios.rol) rolesAsignados++;
    if (cambios.barbero) vinculos++;

    if (ejecutar) {
      await UserModel.updateOne({ _id: usuario._id }, { $set: cambios });
    }
  }

  if (avisos.length) {
    console.log("\nRequieren atención manual:");
    avisos.forEach((a) => console.log(a));
  }

  console.log(
    `\n${ejecutar ? "Aplicado" : "Se aplicarían"}: ${rolesAsignados} roles, ${vinculos} vínculos.`
  );

  if (!ejecutar) {
    console.log("Volvé a correrlo con --ejecutar para escribir los cambios.");
  }
}

async function main() {
  const ejecutar = process.argv.includes("--ejecutar");
  const degradarVinculados = process.argv.includes("--degradar-vinculados");
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/OnofreDb";

  await mongoose.connect(uri);
  console.log(`Conectado a ${uri.replace(/\/\/[^@]*@/, "//<oculto>@")}\n`);

  try {
    await migrar({ ejecutar, degradarVinculados });
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Falló la migración:", error);
    process.exit(1);
  });
}

module.exports = { migrar, normalizar };
