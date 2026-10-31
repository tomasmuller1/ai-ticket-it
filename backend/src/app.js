import express from "express";
import cors from "cors";

import { eventosDeEjemplo } from "./data/seed.js";
import { EventosRepository } from "./repositories/EventosRepository.js";
import { EventosService } from "./services/EventosService.js";
import { EventosController } from "./controllers/EventosController.js";
import { eventosRoutes } from "./routes/eventosRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

// Arma la aplicación inyectando las dependencias de cada capa a mano.
export function createApp({ eventos = eventosDeEjemplo() } = {}) {
  const eventosRepository = new EventosRepository(eventos);
  const eventosService = new EventosService(eventosRepository);
  const eventosController = new EventosController(eventosService);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/eventos", eventosRoutes(eventosController));

  app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));
  app.use(errorHandler);

  return app;
}
