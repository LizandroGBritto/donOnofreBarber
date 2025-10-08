const { UserModel } = require("../models/user.model");
const bcrypt = require("bcrypt");

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

    // Crear usuario administrador por defecto
    const adminUser = new UserModel({
      userName: "admin",
      password: "admin123", // Esta contraseña será hasheada automáticamente por el pre-save hook
      confirmPassword: "admin123", // Requerido por la validación del modelo
    });

    await adminUser.save();

    console.log("✅ Usuario administrador creado exitosamente");
    console.log("📋 Credenciales por defecto:");
    console.log("   Usuario: admin");
    console.log("   Contraseña: admin123");
    console.log(
      "⚠️  IMPORTANTE: Cambia estas credenciales después del primer login"
    );
  } catch (error) {
    console.error("❌ Error creando usuario administrador:", error);
  }
};

module.exports = { createAdminUser };
