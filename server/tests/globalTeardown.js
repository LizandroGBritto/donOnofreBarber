module.exports = async () => {
  const mongo = globalThis.__MONGO_SERVER__;
  if (mongo) {
    await mongo.stop();
  }
};
