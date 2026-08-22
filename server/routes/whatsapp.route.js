const express = require("express");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");
const WhatsappController = require("../controllers/whatsapp.controller");

const WhatsappRouter = express.Router();

// La instancia de WhatsApp es única para todo el negocio: conectarla o
// desconectarla afecta a todos, así que es del admin.
WhatsappRouter.get(
  "/status",
  authenticate,
  requireAdmin,
  WhatsappController.getConnectionStatus
);
WhatsappRouter.get(
  "/connect",
  authenticate,
  requireAdmin,
  WhatsappController.connectInstance
);
WhatsappRouter.post(
  "/send-test",
  authenticate,
  requireAdmin,
  WhatsappController.sendMessage
);

module.exports = WhatsappRouter;
