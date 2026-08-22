const { MongoMemoryServer } = require("mongodb-memory-server");

// Levanta un MongoDB en memoria para toda la corrida de tests y publica su URI
// en process.env, que Jest copia a los workers.
//
// Si la descarga del binario falla (sin internet, proxy, etc.), se puede usar
// el MongoDB ya instalado en la máquina:
//   MONGOMS_SYSTEM_BINARY="C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
module.exports = async () => {
  const mongo = await MongoMemoryServer.create();
  globalThis.__MONGO_SERVER__ = mongo;
  process.env.MONGO_TEST_URI = mongo.getUri();
};
