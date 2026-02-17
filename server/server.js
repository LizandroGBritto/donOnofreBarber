require("dotenv").config();
const config = require("./config/app.config");

// Validar configuración antes de iniciar
config.validate();

const PORT = config.port;
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

app.use(cookieParser());

const corsOptions = config.cors;
app.use(cors(corsOptions));

// Maneja solicitudes preflight para todos los endpoints
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (uploads)
app.use("/uploads", express.static("uploads"));

// Conectar a MongoDB
require("./config/mongoose.config");

// Rutas
const AgendaRouter = require("./routes/agenda.route");
app.use("/api/agenda", AgendaRouter);

const UserRouter = require("./routes/user.route");
app.use("/api/auth", UserRouter); // Para login/register
app.use("/api/user", UserRouter); // Para CRUD de usuarios

const BannerRouter = require("./routes/banner.route");
app.use("/api/banners", BannerRouter);

const ContactoRouter = require("./routes/contacto.route");
app.use("/api/contacto", ContactoRouter);

const UbicacionRouter = require("./routes/ubicacion.route");
app.use("/api/ubicacion", UbicacionRouter);

const ServicioRouter = require("./routes/servicio.route");
app.use("/api/servicios", ServicioRouter);

const HorarioRouter = require("./routes/horario.route");
app.use("/api/horarios", HorarioRouter);

const BarberoRouter = require("./routes/barbero.route");
app.use("/api/barberos", BarberoRouter);

const NotificationRouter = require("./routes/notification.route");
app.use("/api/notifications", NotificationRouter);

// Inicializar servicio de agenda
const AgendaService = require("./services/agendaService");

// 🆕 Inicializar Cron Jobs (WhatsApp reminders)
const CronService = require("./services/cron.service");
CronService.init();

// Ruta temporal para migración
const MigracionRouter = require("./routes/migracion.route");
app.use("/api/migracion", MigracionRouter);

// 🆕 Ruta WhatsApp
const WhatsappRouter = require("./routes/whatsapp.route");
app.use("/api/whatsapp", WhatsappRouter);

// Importar seeder de administrador
const { createAdminUser } = require("./scripts/createAdminSeeder");

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Crear usuario administrador si es necesario
  try {
    await createAdminUser();
  } catch (error) {
    console.error("❌ Error creando usuario administrador:", error);
  }

  // Inicializar turnos si es necesario
  try {
    await AgendaService.inicializarSiEsNecesario();
    console.log("✅ Servicio de agenda inicializado");
  } catch (error) {
    console.error("❌ Error inicializando servicio de agenda:", error);
  }
});
