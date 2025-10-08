#!/usr/bin/env node

// Script standalone para crear usuario administrador
require("dotenv").config();

// Conectar a MongoDB
require("../config/mongoose.config");

// Importar el seeder
const { createAdminUser } = require("./createAdminSeeder");

// Ejecutar el seeder
const runSeeder = async () => {
  console.log("🚀 Ejecutando seeder de usuario administrador...");

  try {
    await createAdminUser();
    console.log("✅ Seeder ejecutado exitosamente");
  } catch (error) {
    console.error("❌ Error ejecutando seeder:", error);
  } finally {
    // Cerrar la conexión a la base de datos
    process.exit(0);
  }
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  runSeeder();
}

module.exports = { runSeeder };
