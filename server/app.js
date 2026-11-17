// La app de Express, sin efectos de arranque.
//
// Acá NO va nada que tenga efectos colaterales al importar: ni conexión a
// MongoDB, ni cron, ni seeders, ni `listen()`. Todo eso vive en server.js.
// La separación existe para que los tests puedan montar la app con supertest
// contra una base en memoria, sin levantar los cron jobs ni pegarle a la base
// real.
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const config = require("./config/app.config");

const app = express();

// En producción Node está detrás de Nginx (un solo salto), que agrega la IP
// real del cliente al final de X-Forwarded-For. Sin esto `req.ip` es la del
// proxy para todos y los rate limits (login, /api/instagram) son globales,
// no por IP. Con 1 se toma el último valor, el que puso Nginx: el cliente no
// lo puede falsificar agregando el encabezado él mismo.
app.set("trust proxy", 1);

app.use(cookieParser());

const corsOptions = config.cors;
app.use(cors(corsOptions));

// Maneja solicitudes preflight para todos los endpoints
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (uploads). Los nombres de archivo son únicos
// por subida (timestamp + random en generateUniqueFilename), nunca se
// reescribe el mismo nombre con contenido distinto — se puede cachear
// agresivamente en el navegador sin riesgo de servir una imagen vieja.
app.use(
  "/uploads",
  express.static("uploads", {
    maxAge: "30d",
    immutable: true,
  })
);

// Rutas
app.use("/api/agenda", require("./routes/agenda.route"));

const UserRouter = require("./routes/user.route");
app.use("/api/auth", UserRouter); // Para login/register
app.use("/api/user", UserRouter); // Para CRUD de usuarios

app.use("/api/banners", require("./routes/banner.route"));
app.use("/api/contacto", require("./routes/contacto.route"));
app.use("/api/ubicacion", require("./routes/ubicacion.route"));
app.use("/api/instagram", require("./routes/instagram.route"));
app.use("/api/servicios", require("./routes/servicio.route"));
app.use("/api/horarios", require("./routes/horario.route"));
app.use("/api/barberos", require("./routes/barbero.route"));
app.use("/api/notifications", require("./routes/notification.route"));
app.use("/api/whatsapp", require("./routes/whatsapp.route"));

// Ruta temporal para migración de documentos con el esquema legacy
app.use("/api/migracion", require("./routes/migracion.route"));

module.exports = app;
