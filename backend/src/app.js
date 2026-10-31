import express from "express";
import cors from "cors";
import helmet from "helmet";

import { cargarConfig } from "./infra/config.js";
import { crearLogger, loggerHttp } from "./infra/logger.js";
import { crearRegistroOpenApi, generarDocumentoOpenApi, montarDocs } from "./infra/openapi.js";
import { eventosDeEjemplo } from "./data/seed.js";
import { EventosRepository } from "./repositories/EventosRepository.js";
import { EventosService } from "./services/EventosService.js";
import { EventosController } from "./controllers/EventosController.js";
import { eventosRoutes, documentarEventos } from "./routes/eventosRoutes.js";
import { errorHandler, rutaNoEncontrada } from "./middlewares/errorHandler.js";

// Arma la aplicación inyectando las dependencias de cada capa a mano.
// Los tests pasan sus propias dependencias (config, repositorios fake, etc.).
export function createApp({
  config = cargarConfig(),
  logger = crearLogger(config.nivelLog),
  eventosRepository = new EventosRepository(eventosDeEjemplo()),
} = {}) {
  const eventosService = new EventosService(eventosRepository);
  const eventosController = new EventosController(eventosService);

  const app = express();
  // En desarrollo se sirve por HTTP en la red local: no forzar HTTPS en los recursos de Swagger UI.
  const esProduccion = config.entorno === "production";
  app.use(
    helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: esProduccion ? [] : null } } }),
  );
  app.use(cors({ origin: config.origenesCors }));
  app.use(loggerHttp(logger));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/eventos", eventosRoutes(eventosController));

  if (config.docsHabilitados) {
    const registro = crearRegistroOpenApi();
    documentarEventos(registro);
    montarDocs(app, generarDocumentoOpenApi(registro));
  }

  app.use(rutaNoEncontrada);
  app.use(errorHandler);

  return app;
}
