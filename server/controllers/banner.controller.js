const Banner = require("../models/banner.model");
const multer = require("multer");
// const sharp = require("sharp"); // Comentado temporalmente por compatibilidad con Node.js
const path = require("path");
const fs = require("fs");

// Configuración de multer para upload de archivos
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Permitir solo imágenes
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos de imagen"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
});

// Crear directorio uploads si no existe
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Función para procesar imagen (temporalmente sin conversión WebP)
const processImage = async (buffer, filename) => {
  const timestamp = Date.now();
  const ext = path.extname(filename);
  const processedFilename = `${timestamp}-${filename.replace(ext, "")}${ext}`;
  const outputPath = path.join(uploadsDir, processedFilename);

  // Guardar la imagen original temporalmente (sin conversión)
  fs.writeFileSync(outputPath, buffer);

  return processedFilename;
};

// Crear un nuevo banner con upload de imagen
const crearBanner = async (req, res) => {
  try {
    let imagenFilename = req.body.imagen;

    // Si se subió una imagen, procesarla
    if (req.file) {
      imagenFilename = await processImage(
        req.file.buffer,
        req.file.originalname
      );
    }

    const bannerData = {
      ...req.body,
      imagen: imagenFilename,
    };

    const banner = new Banner(bannerData);
    await banner.save();

    res.status(201).json({
      success: true,
      message: "Banner creado exitosamente",
      banner,
    });
  } catch (error) {
    console.error("Error al crear banner:", error);

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

// Obtener todos los banners con filtros opcionales
const obtenerBanners = async (req, res) => {
  try {
    const { estado, tipo, version, page = 1, limit = 10 } = req.query;

    let query = {};

    if (estado) query.estado = estado;
    if (tipo) query.tipo = tipo;
    if (version && version !== "ambos") {
      query.$or = [{ version: version }, { version: "ambos" }];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { tipo: 1, orden: 1, createdAt: -1 },
    };

    const banners = await Banner.find(query)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);

    const total = await Banner.countDocuments(query);

    res.status(200).json({
      success: true,
      banners,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
        totalBanners: total,
        hasNextPage: options.page < Math.ceil(total / options.limit),
        hasPrevPage: options.page > 1,
      },
    });
  } catch (error) {
    console.error("Error al obtener banners:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Obtener banners activos para mostrar en frontend
const obtenerBannersActivos = async (req, res) => {
  try {
    const { tipo, version } = req.query;

    const banners = await Banner.getBannersActivos(tipo, version);

    res.status(200).json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error("Error al obtener banners activos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Obtener un banner por ID
const obtenerBannerPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error("Error al obtener banner:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Actualizar un banner
const actualizarBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Banner actualizado exitosamente",
      banner,
    });
  } catch (error) {
    console.error("Error al actualizar banner:", error);

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

// Eliminar un banner
const eliminarBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Banner eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar banner:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Cambiar estado de un banner
const cambiarEstadoBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["activo", "inactivo"].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: "Estado inválido. Debe ser 'activo' o 'inactivo'",
      });
    }

    const banner = await Banner.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner no encontrado",
      });
    }

    res.status(200).json({
      success: true,
      message: `Banner ${
        estado === "activo" ? "activado" : "desactivado"
      } exitosamente`,
      banner,
    });
  } catch (error) {
    console.error("Error al cambiar estado del banner:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Obtener estadísticas de banners
const obtenerEstadisticas = async (req, res) => {
  try {
    const estadisticas = await Banner.getEstadisticas();

    // Formatear las estadísticas para una respuesta más limpia
    const estadisticasFormateadas = {
      total: 0,
      activos: { total: 0, principal: 0, secundario: 0 },
      inactivos: { total: 0, principal: 0, secundario: 0 },
    };

    estadisticas.forEach((stat) => {
      if (stat._id === "activo") {
        estadisticasFormateadas.activos.total = stat.total;
        stat.tipos.forEach((tipo) => {
          estadisticasFormateadas.activos[tipo.tipo] = tipo.count;
        });
      } else if (stat._id === "inactivo") {
        estadisticasFormateadas.inactivos.total = stat.total;
        stat.tipos.forEach((tipo) => {
          estadisticasFormateadas.inactivos[tipo.tipo] = tipo.count;
        });
      }
      estadisticasFormateadas.total += stat.total;
    });

    res.status(200).json({
      success: true,
      estadisticas: estadisticasFormateadas,
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

module.exports = {
  crearBanner,
  obtenerBanners,
  obtenerBannersActivos,
  obtenerBannerPorId,
  actualizarBanner,
  eliminarBanner,
  cambiarEstadoBanner,
  obtenerEstadisticas,
  upload: upload.single("imagen"),
};
