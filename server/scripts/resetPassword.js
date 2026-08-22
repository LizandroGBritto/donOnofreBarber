/**
 * Cambia la contraseña de un usuario del panel.
 *
 * Las contraseñas se guardan como hash bcrypt, que es de una sola vía: si se
 * pierde una, no se recupera — se reemplaza. Este script es la única forma de
 * hacerlo cuando nadie puede entrar al panel.
 *
 * La contraseña nueva NUNCA se pasa como argumento (quedaría en el historial
 * del shell y en la lista de procesos). Se pide por prompt oculto, o por
 * variable de entorno si no hay terminal interactiva.
 *
 * USO:
 *   node scripts/resetPassword.js <userName>
 *   NUEVA_PASSWORD='...' node scripts/resetPassword.js <userName>   # sin prompt
 *
 *   node scripts/resetPassword.js --listar    # ver qué usuarios existen
 */
require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");
const { UserModel } = require("../models/user.model");
// Necesario para el populate de `barbero` al listar: sin este require el
// modelo no queda registrado en mongoose y el populate falla.
require("../models/barbero.model");

const LARGO_MINIMO = 8;

/** Prompt que no hace eco de lo que se tipea. */
function pedirPasswordOculta(mensaje) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(
        new Error(
          "No hay terminal interactiva. Pasá la contraseña por la variable NUEVA_PASSWORD."
        )
      );
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    // Silencia el eco mientras se escribe la contraseña.
    let silenciar = false;
    const escribirOriginal = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (texto) => {
      if (silenciar) return;
      escribirOriginal(texto);
    };

    rl.question(mensaje, (respuesta) => {
      rl.close();
      process.stdout.write("\n");
      resolve(respuesta);
    });
    silenciar = true;
  });
}

async function listarUsuarios() {
  const usuarios = await UserModel.find({})
    .select("userName rol barbero")
    .populate("barbero", "nombre")
    .lean();

  console.log(`${usuarios.length} usuarios:`);
  for (const u of usuarios) {
    const barbero = u.barbero?.nombre ? ` → ${u.barbero.nombre}` : "";
    console.log(`  ${u.userName.padEnd(18)} rol: ${u.rol || "(sin rol)"}${barbero}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/OnofreDb";

  await mongoose.connect(uri);
  console.log(`Conectado a ${uri.replace(/\/\/[^@]*@/, "//<oculto>@")}\n`);

  try {
    if (args.includes("--listar") || args.length === 0) {
      await listarUsuarios();
      if (args.length === 0) {
        console.log("\nUso: node scripts/resetPassword.js <userName>");
      }
      return;
    }

    const userName = args[0];
    const usuario = await UserModel.findOne({ userName });

    if (!usuario) {
      console.error(`No existe el usuario "${userName}".`);
      console.error("Corré con --listar para ver los que hay.");
      process.exitCode = 1;
      return;
    }

    const nueva =
      process.env.NUEVA_PASSWORD ||
      (await pedirPasswordOculta(`Contraseña nueva para "${userName}": `));

    if (!nueva || nueva.length < LARGO_MINIMO) {
      console.error(`La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`);
      process.exitCode = 1;
      return;
    }

    if (!process.env.NUEVA_PASSWORD) {
      const repetida = await pedirPasswordOculta("Repetila: ");
      if (repetida !== nueva) {
        console.error("No coinciden. No se cambió nada.");
        process.exitCode = 1;
        return;
      }
    }

    // Se asigna en el documento y se guarda con .save() para que corra el
    // pre-save que hashea. Un updateOne guardaría la contraseña en texto plano.
    usuario.password = nueva;
    usuario.confirmPassword = nueva; // lo exige la validación del modelo
    await usuario.save();

    console.log(`\n✅ Contraseña de "${userName}" actualizada.`);
    console.log("   Las sesiones abiertas siguen valiendo hasta que venza su cookie.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Falló el cambio de contraseña:", error.message);
  process.exit(1);
});
