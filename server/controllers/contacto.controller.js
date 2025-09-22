const Contacto = require("../models/contacto.model");

// Obtener contacto activo
const obtenerContacto = async (req, res) => {
  try {
    const contacto = await Contacto.findOne({ estado: "activo" }).sort({
      createdAt: -1,
    });

    if (!contacto) {
      return res.status(404).json({
        success: false,
        message: "No se encontró información de contacto",
      });
    }

    res.status(200).json({
      success: true,
      contacto,
    });
  } catch (error) {
    console.error("Error al obtener contacto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Obtener todos los contactos (para admin)
const obtenerTodosContactos = async (req, res) => {
  try {
    const contactos = await Contacto.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      contactos,
    });
  } catch (error) {
    console.error("Error al obtener contactos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Crear nuevo contacto
const crearContacto = async (req, res) => {
  try {
    const { whatsapp, instagram, correo } = req.body;

    // Desactivar contactos anteriores
    await Contacto.updateMany({}, { estado: "inactivo" });

    const nuevoContacto = new Contacto({
      whatsapp,
      instagram,
      correo,
      estado: "activo",
    });

    const contactoGuardado = await nuevoContacto.save();

    res.status(201).json({
      success: true,
      message: "Contacto creado exitosamente",
      contacto: contactoGuardado,
    });
  } catch (error) {
    console.error("Error al crear contacto:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Error de validación",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Actualizar contacto
const actualizarContacto = async (req, res) => {
  try {
    const { id } = req.params;
    const { whatsapp, instagram, correo, estado } = req.body;

    const contactoActualizado = await Contacto.findByIdAndUpdate(
      id,
      { whatsapp, instagram, correo, estado },
      { new: true, runValidators: true }
    );

    if (!contactoActualizado) {
      return res.status(404).json({
        success: false,
        message: "Contacto no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contacto actualizado exitosamente",
      contacto: contactoActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar contacto:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Error de validación",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Eliminar contacto
const eliminarContacto = async (req, res) => {
  try {
    const { id } = req.params;

    const contactoEliminado = await Contacto.findByIdAndDelete(id);

    if (!contactoEliminado) {
      return res.status(404).json({
        success: false,
        message: "Contacto no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contacto eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar contacto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

module.exports = {
  obtenerContacto,
  obtenerTodosContactos,
  crearContacto,
  actualizarContacto,
  eliminarContacto,
};
