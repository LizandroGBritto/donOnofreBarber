const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const WhatsappController = require("../controllers/whatsapp.controller");

const WhatsappRouter = express.Router();

WhatsappRouter.get(
  "/status",
  authenticate,
  WhatsappController.getConnectionStatus
);
WhatsappRouter.get("/connect", authenticate, WhatsappController.connectInstance);
WhatsappRouter.post(
  "/send-test",
  authenticate,
  WhatsappController.sendMessage
);

module.exports = WhatsappRouter;
