// Bootstrap del servidor: valida configuración, conecta a MongoDB, levanta los
// cron jobs y arranca a escuchar. La app de Express en sí vive en app.js, que
// no tiene efectos de arranque para poder montarla en los tests.
require("dotenv").config();
const config = require("./config/app.config");

// Validar configuración antes de iniciar
config.validate();

const PORT = config.port;

// Conectar a MongoDB (el require dispara la conexión)
require("./config/mongoose.config");

const app = require("./app");

// Inicializar servicio de agenda
const AgendaService = require("./services/agendaService");

// 🆕 Inicializar Cron Jobs (WhatsApp reminders)
const CronService = require("./services/cron.service");
CronService.init();

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
