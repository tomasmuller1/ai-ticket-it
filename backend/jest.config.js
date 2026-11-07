// Misma zona horaria en cualquier máquina (y en CI) para que las fechas del seed sean deterministas.
// Se define acá porque los workers de Jest heredan el entorno de este proceso.
process.env.TZ = "America/Argentina/Buenos_Aires";

export default {
  testEnvironment: "node",
  // El proyecto es ESM nativo: no hace falta Babel. Requiere --experimental-vm-modules (ver package.json).
  transform: {},
  testMatch: ["<rootDir>/test/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/server.js"],
  coverageProvider: "v8",
  coverageReporters: ["text", "html"],
};
