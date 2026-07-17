const { UserModel } = require("../models/user.model");
const crypto = require("crypto");

const createAdminUser = async () => {
  try {
    console.log("🔍 Verificando si existe usuario administrador...");

    // Verificar si ya existe algún usuario
    const existingUsers = await UserModel.countDocuments();

    if (existingUsers > 0) {
      console.log("✅ Ya existen usuarios en el sistema.");
      return;
    }

    console.log("👤 Creando usuario administrador por defecto...");

    // Si no se define ADMIN_PASSWORD, generar una aleatoria en vez de
    // usar una contraseña trivial hardcodeada.
    const adminPassword =
      process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("hex");

    // Crear usuario administrador por defecto
    const adminUser = new UserModel({
      userName: "admin",
      password: adminPassword, // Esta contraseña será hasheada automáticamente por el pre-save hook
      confirmPassword: adminPassword, // Requerido por la validación del modelo
    });

    await adminUser.save();

    console.log("✅ Usuario administrador creado exitosamente");
    console.log("📋 Credenciales por defecto:");
    console.log("   Usuario: admin");
    console.log(`   Contraseña: ${adminPassword}`);
    console.log(
      "⚠️  IMPORTANTE: Guarda esta contraseña ahora y cámbiala después del primer login. No se volverá a mostrar."
    );
  } catch (error) {
    console.error("❌ Error creando usuario administrador:", error);
  }
};

module.exports = { createAdminUser };
