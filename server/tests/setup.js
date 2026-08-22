// Se ejecuta en cada worker de Jest, antes de los tests.
//
// Importante: estas variables se setean ANTES de que cualquier test importe
// app.js / app.config.js. dotenv no pisa variables ya definidas, así que estas
// ganan sobre el .env real y ningún test puede terminar apuntando a la base de
// desarrollo por accidente.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-no-usar-en-produccion";
process.env.MONGODB_URI = process.env.MONGO_TEST_URI;

const mongoose = require("mongoose");

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);
});

// Cada test arranca con la base vacía: sin orden implícito entre tests ni
// estado que se filtre de uno a otro.
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((coleccion) => coleccion.deleteMany({}))
  );
});

afterAll(async () => {
  await mongoose.disconnect();
});
