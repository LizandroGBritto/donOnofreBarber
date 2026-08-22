const { UserModel } = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/app.config");

// Respuesta única para cualquier login fallido. No debe revelar si el que
// falló fue el usuario o la contraseña.
const CREDENCIALES_INVALIDAS = "Usuario o contraseña incorrectos";

/**
 * Traduce un error de clave duplicada de MongoDB (E11000) al mensaje que
 * corresponde según el índice que se violó. Antes lo hacía
 * mongoose-unique-validator, que se sacó del modelo por no entender índices
 * parciales (ver user.model.js).
 * Devuelve null si el error no es un E11000.
 */
const mensajeDuplicado = (error) => {
  if (error?.code !== 11000) return null;
  const campo = Object.keys(error.keyPattern || {})[0];
  if (campo === "userName") return "Ya existe un usuario con ese nombre";
  if (campo === "barbero") return "Ese barbero ya tiene un usuario asignado";
  return "Ya existe un registro con esos datos";
};

module.exports = {
  register: async (req, res) => {
    try {
      // Lista blanca: el body no puede setear cualquier campo del modelo.
      const { userName, password, confirmPassword, rol, barbero } = req.body;
      const user = new UserModel({
        userName,
        password,
        confirmPassword,
        ...(rol ? { rol } : {}),
        ...(barbero ? { barbero } : {}),
      });

      await user.save();

      const { password: _, ...sinPassword } = user.toObject();
      res.status(201).json({ msg: "success!", user: sinPassword });
    } catch (error) {
      const duplicado = mensajeDuplicado(error);
      if (duplicado) {
        return res.status(400).json({ msg: duplicado });
      }
      if (error.name === "ValidationError") {
        return res.status(400).json({
          msg: "Error de validación",
          errors: error.errors,
        });
      }
      console.error("Error creando usuario:", error);
      res.status(500).json({ msg: "Error al crear el usuario" });
    }
  },

  login: (req, res) => {
    // Verifica que los datos recibidos en req.body sean correctos

    if (
      !req.body.userName ||
      !req.body.password ||
      typeof req.body.userName !== "string" ||
      typeof req.body.password !== "string"
    ) {
      return res
        .status(400)
        .json({ msg: "Username and password are required" });
    }

    UserModel.findOne({ userName: req.body.userName })
      .then((user) => {
        if (!user) {
          // Mismo mensaje y mismo status que cuando la contraseña es
          // incorrecta: distinguir ambos casos permitía averiguar qué usuarios
          // existen antes de atacarlos (enumeración de usuarios).
          console.log(`Login fallido (usuario inexistente)`);
          return res.status(400).json({ msg: CREDENCIALES_INVALIDAS });
        }

        // Compara la contraseña con bcrypt
        bcrypt
          .compare(req.body.password, user.password)
          .then((passwordIsValid) => {
            if (!passwordIsValid) {
              console.log(`Login fallido (contraseña incorrecta)`);
              return res.status(400).json({ msg: CREDENCIALES_INVALIDAS });
            }

            // Si la contraseña es válida, genera el token JWT
            // El payload del JWT se mantiene mínimo a propósito: el rol y el
            // barbero los relee authenticate desde la base en cada request, así
            // un cambio de permisos no espera a que venza la cookie.
            const userInfo = {
              _id: user._id,
              userName: user.userName,
            };

            // Lo que se le devuelve al front sí los incluye: los necesita para
            // saber qué secciones del panel mostrar.
            const userParaCliente = {
              ...userInfo,
              rol: user.rol || "admin",
              barbero: user.barbero || null,
            };

            const secret = process.env.JWT_SECRET || "secretKey";
            try {
              // El token lleva expiración propia: antes se firmaba sin
              // `expiresIn`, así que era válido para siempre y un token robado
              // servía indefinidamente aunque la cookie ya hubiese vencido en
              // el navegador. Cookie y token vencen ahora a la vez.
              const newJWT = jwt.sign(userInfo, secret, {
                expiresIn: Math.floor(config.security.sessionExpiry / 1000),
              });
              res
                .cookie("usertoken", newJWT, {
                  httpOnly: true,
                  secure: config.isProduction,
                  sameSite: "lax",
                  expires: new Date(Date.now() + config.security.sessionExpiry),
                })
                .json({ msg: "success!", user: userParaCliente });
            } catch (error) {
              console.error("Error generando JWT:", error);
              return res.status(500).json({ msg: "Error generating token" });
            }
          })
          .catch((err) => {
            console.error("Error comparando contraseñas:", err);
            return res.status(400).json({ msg: "Invalid login attempt" });
          });
      })
      .catch((err) => {
        console.error("Error buscando usuario:", err);
        return res.status(400).json({ error: err });
      });
  },

  logout: (req, res) => {
    res
      .clearCookie("usertoken", {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: "lax",
      })
      .json({ msg: "Logout successful" });
  },

  // Obtener todos los usuarios
  getAllUsers: async (req, res) => {
    try {
      const users = await UserModel.find({}, { password: 0 }); // Excluir password
      res.json(users);
    } catch (error) {
      res
        .status(500)
        .json({ msg: "Error al obtener usuarios", error: error.message });
    }
  },

  // Obtener un usuario por ID
  getOneUser: async (req, res) => {
    try {
      const user = await UserModel.findById(req.params.id, { password: 0 }); // Excluir password
      if (!user) {
        return res.status(404).json({ msg: "Usuario no encontrado" });
      }
      res.json(user);
    } catch (error) {
      res
        .status(500)
        .json({ msg: "Error al obtener usuario", error: error.message });
    }
  },

  // Actualizar usuario
  updateUser: async (req, res) => {
    try {
      const { userName, password, rol, barbero } = req.body;
      const updateData = {};

      if (userName !== undefined) updateData.userName = userName;

      // Si se proporciona una nueva contraseña, hashearla
      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
      }

      // Rol y barbero solo los cambia un admin. La ruta deja pasar también al
      // propio usuario (para que un barbero pueda cambiarse la contraseña), así
      // que sin este chequeo un barbero podría ascenderse a admin sobre su
      // propio registro.
      if (req.user?.rol === "admin") {
        if (rol !== undefined) updateData.rol = rol;
        if (barbero !== undefined) {
          updateData.barbero = barbero || null;
        }
      }

      const user = await UserModel.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select("-password"); // Excluir password de la respuesta

      if (!user) {
        return res.status(404).json({ msg: "Usuario no encontrado" });
      }

      res.json({ msg: "Usuario actualizado exitosamente", user });
    } catch (error) {
      const duplicado = mensajeDuplicado(error);
      if (duplicado) {
        return res.status(400).json({ msg: duplicado });
      }
      res
        .status(500)
        .json({ msg: "Error al actualizar usuario", error: error.message });
    }
  },

  // Eliminar usuario
  deleteUser: async (req, res) => {
    try {
      // No permitir dejar el sistema sin ningún usuario: nadie podría
      // volver a loguearse para crear uno nuevo (el seeder solo corre si
      // la colección está vacía en el arranque del servidor).
      const totalUsuarios = await UserModel.countDocuments();
      if (totalUsuarios <= 1) {
        return res.status(400).json({
          msg: "No se puede eliminar el último usuario del sistema",
        });
      }

      const user = await UserModel.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ msg: "Usuario no encontrado" });
      }
      res.json({ msg: "Usuario eliminado exitosamente" });
    } catch (error) {
      res
        .status(500)
        .json({ msg: "Error al eliminar usuario", error: error.message });
    }
  },
};
