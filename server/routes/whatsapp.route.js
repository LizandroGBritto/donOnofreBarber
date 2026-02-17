const express = require("express");
const WhatsappController = require("../controllers/whatsapp.controller");

const WhatsappRouter = express.Router();

WhatsappRouter.get("/status", WhatsappController.getConnectionStatus);
WhatsappRouter.get("/connect", WhatsappController.connectInstance);
WhatsappRouter.post("/send-test", WhatsappController.sendMessage);

module.exports = WhatsappRouter;
