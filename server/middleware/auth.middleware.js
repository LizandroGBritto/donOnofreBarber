const jwt = require("jsonwebtoken");

module.exports = {
  authenticate: (req, res, next) => {
    const token = req.cookies.usertoken;

    if (!token) {
      return res.status(401).json({ msg: "Token no proporcionado" });
    }

    try {
      const secret = process.env.JWT_SECRET || "secretKey";
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ msg: "Token inválido" });
    }
  },
};
