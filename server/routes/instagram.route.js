const express = require("express");
const rateLimit = require("express-rate-limit");
const { obtenerFeed, renovarFeed } = require("../controllers/instagram.controller");

const router = express.Router();

// La renovación baja hasta 8 fotos: pocas por IP alcanzan (una por día es lo
// normal; el resto recibe 409 sin hacer nada).
const limiteRenovar = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Probá más tarde." },
  skip: () => process.env.NODE_ENV === "test" && !process.env.TEST_RATE_LIMIT,
});

router.get("/", obtenerFeed);
router.post("/", limiteRenovar, renovarFeed);

module.exports = router;
