require('dotenv').config();
const PORT = process.env.PORT || 8000;
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());

const corsOptions = {
    credentials: true,
    origin: "http://localhost:5173",
    methods: "GET, POST, PUT, DELETE"
};
app.use(cors(corsOptions));

// Maneja solicitudes preflight para todos los endpoints
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar a MongoDB
require("./config/mongoose.config");

// Rutas
const AgendaRouter = require("./routes/agenda.route");
app.use("/api/agenda", AgendaRouter);

const UserRouter = require("./routes/user.route");
app.use("/api/auth", UserRouter);

const AdamspayRouter = require("./routes/adamsPay.route");
app.use("/api/adamspay", AdamspayRouter); // Usar la ruta del webhook

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});