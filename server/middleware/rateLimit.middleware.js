const rateLimit = require("express-rate-limit");

// Segunda capa de defensa contra fuerza bruta sobre el login.
//
// Nginx ya limita a 5r/m por IP en `^/api/(auth|user)/login$`, y esa sigue
// siendo la primera barrera. Esto cubre el caso en que algo llegue al Node sin
// pasar por Nginx: un proceso en el propio server, un port-forward, o una
// exposición directa del :8000 en el futuro. Defensa en profundidad — si la
// única protección vive en el proxy, alcanza con esquivar el proxy.
//
// El límite es más holgado que el de Nginx a propósito: no queremos que esta
// capa moleste en operación normal, solo que exista si la de adelante no está.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 20, // intentos por IP en esa ventana
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Contar solo los intentos fallidos: quien entra bien no gasta cupo.
  skipSuccessfulRequests: true,
  message: {
    msg: "Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.",
  },
  // En los tests se desactiva para no tener que contar requests en cada caso.
  skip: () => process.env.NODE_ENV === "test" && !process.env.TEST_RATE_LIMIT,
});

module.exports = { loginLimiter };
