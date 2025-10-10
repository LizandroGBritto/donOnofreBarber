const webpush = require("web-push");

// Generar claves VAPID (solo hacer una vez)
// const vapidKeys = webpush.generateVAPIDKeys();
// console.log('Public Key:', vapidKeys.publicKey);
// console.log('Private Key:', vapidKeys.privateKey);

// Claves VAPID desde variables de entorno
const vapidKeys = {
  publicKey:
    process.env.VAPID_PUBLIC_KEY ||
    "0",
  privateKey:
    process.env.VAPID_PRIVATE_KEY ||
    "0",
};

const vapidEmail = process.env.VAPID_EMAIL || "donOnofre.barberia@gmail.com";

webpush.setVapidDetails(
  `mailto:${vapidEmail}`,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

module.exports = {
  webpush,
  vapidKeys,
};
