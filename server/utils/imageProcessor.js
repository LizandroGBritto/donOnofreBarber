const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

/**
 * Convierte una imagen a formato WEBP
 * @param {Buffer|string} input - Buffer de la imagen o ruta del archivo
 * @param {string} outputPath - Ruta donde guardar la imagen convertida
 * @param {Object} options - Opciones de conversión
 * @param {number} options.quality - Calidad de la imagen (1-100, default: 80)
 * @param {number} options.width - Ancho máximo (opcional)
 * @param {number} options.height - Alto máximo (opcional)
 * @returns {Promise<string>} - Nombre del archivo generado
 */
const convertToWebP = async (input, outputPath, options = {}) => {
  try {
    const { quality = 80, width, height } = options;

    // Crear el directorio si no existe
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Procesar la imagen
    let processor = sharp(input).webp({ quality });

    // Aplicar redimensionamiento si se especifica
    if (width || height) {
      processor = processor.resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Guardar la imagen
    await processor.toFile(outputPath);

    return path.basename(outputPath);
  } catch (error) {
    console.error("Error al convertir imagen a WEBP:", error);
    throw new Error("Error en la conversión de imagen");
  }
};

/**
 * Elimina un archivo de imagen
 * @param {string} filename - Nombre del archivo a eliminar
 * @param {string} uploadsDir - Directorio de uploads
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
const deleteImage = async (filename, uploadsDir = "./uploads") => {
  try {
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error al eliminar imagen:", error);
    return false;
  }
};

/**
 * Genera un nombre único para el archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} prefix - Prefijo opcional
 * @returns {string} - Nombre único con extensión .webp
 */
const generateUniqueFilename = (originalName, prefix = "") => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const baseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9]/g, "_");

  return `${prefix}${timestamp}-${random}-${baseName}.webp`;
};

/**
 * Procesa múltiples imágenes y las convierte a WEBP
 * @param {Array} files - Array de archivos multer
 * @param {string} uploadsDir - Directorio de uploads
 * @param {string} prefix - Prefijo para los nombres de archivo
 * @param {Object} options - Opciones de conversión
 * @returns {Promise<Array>} - Array de nombres de archivos generados
 */
const processMultipleImages = async (
  files,
  uploadsDir = "./uploads",
  prefix = "",
  options = {}
) => {
  const processedFiles = [];

  for (const file of files) {
    try {
      const filename = generateUniqueFilename(file.originalname, prefix);
      const outputPath = path.join(uploadsDir, filename);

      await convertToWebP(file.buffer, outputPath, options);
      processedFiles.push(filename);
    } catch (error) {
      console.error(`Error procesando imagen ${file.originalname}:`, error);
      // Continuar con las demás imágenes
    }
  }

  return processedFiles;
};

module.exports = {
  convertToWebP,
  deleteImage,
  generateUniqueFilename,
  processMultipleImages,
};
