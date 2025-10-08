const webpush = require("web-push");

// Generar claves VAPID (solo hacer una vez)
// const vapidKeys = webpush.generateVAPIDKeys();
// console.log('Public Key:', vapidKeys.publicKey);
// console.log('Private Key:', vapidKeys.privateKey);

// Claves VAPID (en producción, usar variables de entorno)
const vapidKeys = {
  publicKey:
    "BMjlOUjChPSr5ovhDZvclCZxPO7ra3XEu8YkqvlSQvXx--sWrUlqtUbxcMNEATH-xdkvxSioPzXFrRri5FQe2Qc",
  privateKey: "2d0yg4spyvkYkMHaz_bpRoa4nVkqZKII4vKay-8ULuU",
};

webpush.setVapidDetails(
  "mailto:donOnofre.barberia@gmail.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

module.exports = {
  webpush,
  vapidKeys,
};
