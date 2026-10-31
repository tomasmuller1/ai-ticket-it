import express from "express";
import cors from "cors";
import helmet from "helmet";

import { cargarConfig } from "./infra/config.js";
import { crearLogger, loggerHttp } from "./infra/logger.js";
import { crearRegistroOpenApi, generarDocumentoOpenApi, montarDocs } from "./infra/openapi.js";
import { Reloj } from "./infra/Reloj.js";
import { AutenticadorDesarrollo } from "./infra/AutenticadorDesarrollo.js";
import { sembrar } from "./data/seed.js";
import { crearRepositorios } from "./repositories/index.js";
import { EventosService } from "./services/EventosService.js";
import { ReseniasService } from "./services/ReseniasService.js";
import { CategoriasService } from "./services/CategoriasService.js";
import {
  CategoriasController,
  EventosController,
  OrganizadoresController,
} from "./controllers/EventosController.js";
import {
  categoriasRoutes,
  documentarEventos,
  eventosRoutes,
  organizadoresRoutes,
} from "./routes/eventosRoutes.js";
import { requiereAutenticacion } from "./middlewares/autenticacion.js";
import { devRoutes, documentarDev } from "./routes/devRoutes.js";
import { errorHandler, rutaNoEncontrada } from "./middlewares/errorHandler.js";

function repositoriosConDatosDeEjemplo(reloj) {
  const repositorios = crearRepositorios();
  sembrar(repositorios, reloj);
  return repositorios;
}

// Arma la aplicación inyectando las dependencias de cada capa a mano.
// Los tests pasan sus propias dependencias (config, reloj, repositorios, autenticador).
export function createApp({
  config = cargarConfig(),
  logger = crearLogger(config.nivelLog),
  reloj = new Reloj(),
  repositorios = repositoriosConDatosDeEjemplo(reloj),
  autenticador = new AutenticadorDesarrollo((id) => repositorios.usuarios.buscarPorId(id)),
} = {}) {
  const esProduccion = config.entorno === "production";
  if (esProduccion && autenticador instanceof AutenticadorDesarrollo) {
    throw new Error("AutenticadorDesarrollo no puede usarse en producción");
  }

  const reseniasService = new ReseniasService(repositorios);
  const eventosService = new EventosService(repositorios, reseniasService, reloj);
  const autenticado = requiereAutenticacion(autenticador);

  const app = express();
  // En desarrollo se sirve por HTTP en la red local: no forzar HTTPS en los recursos de Swagger UI.
  app.use(
    helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: esProduccion ? [] : null } } }),
  );
  app.use(cors({ origin: config.origenesCors }));
  app.use(loggerHttp(logger));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/eventos", eventosRoutes(new EventosController(eventosService, reseniasService), autenticado));
  app.use("/api/categorias", categoriasRoutes(new CategoriasController(new CategoriasService(repositorios))));
  app.use("/api/organizadores", organizadoresRoutes(new OrganizadoresController(reseniasService)));
  if (!esProduccion) {
    app.use("/api/dev", devRoutes({ restaurarDatos: () => sembrar(repositorios, reloj) }));
  }

  if (config.docsHabilitados) {
    const registro = crearRegistroOpenApi();
    documentarEventos(registro);
    documentarDev(registro);
    montarDocs(app, generarDocumentoOpenApi(registro));
  }

  app.use(rutaNoEncontrada);
  app.use(errorHandler);

  return app;
}
