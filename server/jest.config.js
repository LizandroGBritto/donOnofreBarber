module.exports = {
  testEnvironment: "node",
  // Un único mongod en memoria compartido por toda la corrida.
  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  // La primera corrida puede tener que descargar el binario de MongoDB.
  testTimeout: 30000,
  // Evita que un handle abierto deje el proceso colgado sin explicación.
  detectOpenHandles: false,
};
