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

// Cierre ordenado: deja de aceptar conexiones y espera a que terminen las requests en curso.
function apagar(senal) {
  logger.info(`Recibida ${senal}, cerrando el servidor...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => apagar("SIGTERM"));
process.on("SIGINT", () => apagar("SIGINT"));
