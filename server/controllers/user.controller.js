const { UserModel } = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = {
  register: (req, res) => {
    const user = new UserModel(req.body);
    user
      .save()
      .then(() => {
        res.json({ msg: "success!", user: user });
      })
      .catch((err) => res.json(err));
  },

  login: (req, res) => {
    // Verifica que los datos recibidos en req.body sean correctos

    if (!req.body.userName || !req.body.password) {
      return res
        .status(400)
        .json({ msg: "Username and password are required" });
    }

    UserModel.findOne({ userName: req.body.userName })
      .then((user) => {
        if (!user) {
          console.log("Usuario no encontrado");
          return res.status(400).json({ msg: "Usuario no encontrado" });
        }

        // Compara la contraseña con bcrypt
        bcrypt
          .compare(req.body.password, user.password)
          .then((passwordIsValid) => {
            if (!passwordIsValid) {
              console.log("Contraseña incorrecta");
              return res.status(400).json({ msg: "Contraseña incorrecta" });
            }

            // Si la contraseña es válida, genera el token JWT
            const userInfo = {
              _id: user._id,
              userName: user.userName,
            };

            const secret = process.env.JWT_SECRET || "secretKey";
            try {
              const newJWT = jwt.sign(userInfo, secret);
              res
                .cookie("usertoken", newJWT, {
                  httpOnly: true,
                  expires: new Date(Date.now() + 900000000),
                })
                .json({ msg: "success!", user: userInfo });
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
      const { userName, password } = req.body;
      const updateData = { userName };

      // Si se proporciona una nueva contraseña, hashearla
      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
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
      res
        .status(500)
        .json({ msg: "Error al actualizar usuario", error: error.message });
    }
  },

  // Eliminar usuario
  deleteUser: async (req, res) => {
    try {
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
