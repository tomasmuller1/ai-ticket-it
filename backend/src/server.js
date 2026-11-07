import { createApp } from "./app.js";
import { cargarConfig } from "./infra/config.js";
import { crearLogger } from "./infra/logger.js";

const config = cargarConfig();
const logger = crearLogger(config.nivelLog);
const app = createApp({ config, logger });

// 0.0.0.0 para que el celular pueda conectarse por la red local.
const server = app.listen(config.puerto, "0.0.0.0", () => {
  logger.info(`AI Ticket It API escuchando en http://localhost:${config.puerto} (${config.entorno})`);
  if (config.docsHabilitados) {
    logger.info(`Documentación en http://localhost:${config.puerto}/api/docs`);
  }
});

// Barrido de reservas sin pagar: cancela las vencidas y libera su cupo.
const BARRIDO_RESERVAS_MS = 60_000;
const barridoReservas = setInterval(() => {
  app.locals
    .vencerReservas()
    .catch((err) => logger.error({ err }, "No se pudo barrer las reservas vencidas"));
}, BARRIDO_RESERVAS_MS);
barridoReservas.unref();

// Cierre ordenado: deja de aceptar conexiones y espera a que terminen las requests en curso.
function apagar(senal) {
  logger.info(`Recibida ${senal}, cerrando el servidor...`);
  clearInterval(barridoReservas);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => apagar("SIGTERM"));
process.on("SIGINT", () => apagar("SIGINT"));
