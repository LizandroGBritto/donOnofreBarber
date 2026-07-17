/**
 * Seed inicial de datos reales para el primer arranque en producción.
 * Idempotente: cada bloque verifica si el dato ya existe antes de crearlo,
 * así que se puede correr más de una vez sin duplicar nada.
 *
 * Uso: node scripts/seedProduccion.js
 * (requiere que MONGODB_URI ya esté configurado en el .env del servidor)
 */
require("dotenv").config();
const mongoose = require("mongoose");

const HorarioModel = require("../models/horario.model");
const BarberoModel = require("../models/barbero.model");
const { UserModel } = require("../models/user.model");
const ServicioModel = require("../models/servicio.model");
const BannerModel = require("../models/banner.model");
const UbicacionModel = require("../models/ubicacion.model");
const ContactoModel = require("../models/contacto.model");

const DIAS_LABORALES = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

const HORARIOS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

const BARBEROS = [
  {
    nombre: "Lisandro Alonzo",
    descripcion: "Barbero",
    foto: "barbero-placeholder.webp",
  },
  {
    nombre: "Elias Lugo",
    descripcion: "Barbero",
    foto: "barbero-placeholder.webp",
  },
];

// Las contraseñas NUNCA se hardcodean acá (el repo es público) — se pasan
// por variables de entorno al momento de correr el script en el servidor:
//   SEED_PASS_LISANDROALONZO=... SEED_PASS_ELIASLUGO=... node scripts/seedProduccion.js
const USUARIOS_PANEL = [
  { userName: "LisandroAlonzo", envVar: "SEED_PASS_LISANDROALONZO" },
  { userName: "EliasLugo", envVar: "SEED_PASS_ELIASLUGO" },
];

const SERVICIOS = [
  { nombre: "Corte", descripcion: "Corte de cabello", precio: 50000 },
  {
    nombre: "Corte y Barba",
    descripcion: "Corte de cabello y arreglo de barba",
    precio: 80000,
  },
  { nombre: "Ceja", descripcion: "Perfilado de cejas", precio: 20000 },
];

const BANNER = {
  titulo: "prueba",
  descripcion: "prueba",
  imagen: "banner-1759461694150-534-AlonzoStylev2.webp",
  estado: "activo",
  tipo: "principal",
  version: "ambos",
  orden: 0,
};

const UBICACION = {
  direccion: "Calle San Juan",
  enlaceMaps: "https://maps.app.goo.gl/z2PDumPPRgR4pKF89",
};

const CONTACTO = {
  whatsapp: "+595992323733",
  instagram: "@alonzo_style",
  correo: "brittolizandro@gmail.com",
};

async function seedHorarios() {
  let creados = 0;
  for (const hora of HORARIOS) {
    const existe = await HorarioModel.findOne({ hora });
    if (!existe) {
      await HorarioModel.create({
        hora,
        dias: DIAS_LABORALES,
        estado: "activo",
      });
      creados++;
    }
  }
  console.log(`✅ Horarios: ${creados} creados, ${HORARIOS.length - creados} ya existían`);
}

async function seedBarberos() {
  const idsCreados = [];
  for (const barbero of BARBEROS) {
    let doc = await BarberoModel.findOne({ nombre: barbero.nombre });
    if (!doc) {
      doc = await BarberoModel.create({
        ...barbero,
        activo: true,
        incluirEnAgenda: true,
      });
      console.log(`✅ Barbero creado: ${barbero.nombre}`);
    } else {
      console.log(`⏭️  Barbero ya existía: ${barbero.nombre}`);
    }
    idsCreados.push(doc._id);
  }
  return idsCreados;
}

async function seedUsuarios() {
  for (const usuario of USUARIOS_PANEL) {
    const existe = await UserModel.findOne({ userName: usuario.userName });
    if (existe) {
      console.log(`⏭️  Usuario ya existía: ${usuario.userName}`);
      continue;
    }

    const password = process.env[usuario.envVar];
    if (!password) {
      throw new Error(
        `Falta la variable de entorno ${usuario.envVar} para crear el usuario ${usuario.userName}`
      );
    }

    const nuevoUsuario = new UserModel({
      userName: usuario.userName,
      password,
      confirmPassword: password,
    });
    await nuevoUsuario.save();
    console.log(`✅ Usuario creado: ${usuario.userName}`);
  }
}

async function seedServicios() {
  let creados = 0;
  for (const servicio of SERVICIOS) {
    const existe = await ServicioModel.findOne({ nombre: servicio.nombre });
    if (!existe) {
      await ServicioModel.create({ ...servicio, activo: true, imagenes: [] });
      creados++;
    }
  }
  console.log(`✅ Servicios: ${creados} creados, ${SERVICIOS.length - creados} ya existían`);
}

async function seedBanner() {
  const existe = await BannerModel.findOne({ imagen: BANNER.imagen });
  if (!existe) {
    await BannerModel.create(BANNER);
    console.log("✅ Banner creado");
  } else {
    console.log("⏭️  Banner ya existía");
  }
}

async function seedUbicacion() {
  const existe = await UbicacionModel.findOne({});
  if (!existe) {
    await UbicacionModel.create({ ...UBICACION, estado: "activo" });
    console.log("✅ Ubicación creada");
  } else {
    console.log("⏭️  Ubicación ya existía");
  }
}

async function seedContacto() {
  const existe = await ContactoModel.findOne({});
  if (!existe) {
    await ContactoModel.create({ ...CONTACTO, estado: "activo" });
    console.log("✅ Contacto creado");
  } else {
    console.log("⏭️  Contacto ya existía");
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("🔌 Conectado a MongoDB\n");

  await seedHorarios();
  await seedBarberos();
  await seedUsuarios();
  await seedServicios();
  await seedBanner();
  await seedUbicacion();
  await seedContacto();

  console.log("\n🎉 Seed completado");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("❌ Error en el seed:", error);
  process.exit(1);
});
