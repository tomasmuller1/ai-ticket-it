import express from "express";
import cors from "cors";
import helmet from "helmet";

import { cargarConfig } from "./infra/config.js";
import { crearLogger, loggerHttp } from "./infra/logger.js";
import { crearRegistroOpenApi, generarDocumentoOpenApi, montarDocs } from "./infra/openapi.js";
import { Reloj } from "./infra/Reloj.js";
import { AuthService } from "./auth/AuthService.js";
import { AutenticadorJwt } from "./auth/AutenticadorJwt.js";
import { Contrasenias } from "./auth/Contrasenias.js";
import { ServicioTokens } from "./auth/ServicioTokens.js";
import { AuthController } from "./controllers/AuthController.js";
import { authRoutes, documentarAuth } from "./routes/authRoutes.js";
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
import { ComprasService } from "./services/ComprasService.js";
import { UsuariosService } from "./services/UsuariosService.js";
import { ComprasController, UsuariosController } from "./controllers/ComprasController.js";
import {
  comprasDeEventoRoutes,
  comprasRoutes,
  documentarCompras,
  usuariosRoutes,
} from "./routes/comprasRoutes.js";
import { PasarelaPagosFake } from "./infra/PasarelaPagosFake.js";
import { requiereAutenticacion } from "./middlewares/autenticacion.js";
import { devRoutes, documentarDev } from "./routes/devRoutes.js";
import { errorHandler, rutaNoEncontrada } from "./middlewares/errorHandler.js";

function repositoriosConDatosDeEjemplo(reloj) {
  const repositorios = crearRepositorios();
  sembrar(repositorios, reloj);
  return repositorios;
}

// Arma la aplicación inyectando las dependencias de cada capa a mano.
// Los tests pasan sus propias dependencias (config, reloj, repositorios, pasarela, etc.).
export function createApp({
  config = cargarConfig(),
  logger = crearLogger(config.nivelLog),
  reloj = new Reloj(),
  repositorios = repositoriosConDatosDeEjemplo(reloj),
  servicioTokens = new ServicioTokens(config.auth, reloj),
  contrasenias = new Contrasenias(),
  autenticador = new AutenticadorJwt(servicioTokens, (id) => repositorios.usuarios.buscarPorId(id)),
  pasarelaPagos = new PasarelaPagosFake(),
} = {}) {
  const esProduccion = config.entorno === "production";
  const authService = new AuthService(repositorios, { servicioTokens, contrasenias, reloj });

  const reseniasService = new ReseniasService(repositorios);
  const eventosService = new EventosService(repositorios, reseniasService, reloj);
  const comprasController = new ComprasController(
    new ComprasService(repositorios, pasarelaPagos, reloj),
    reloj,
  );
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
  app.use("/api/auth", authRoutes(new AuthController(authService), config.auth));
  app.use("/api/eventos", eventosRoutes(new EventosController(eventosService, reseniasService), autenticado));
  app.use("/api/eventos", comprasDeEventoRoutes(comprasController, autenticado));
  app.use("/api/compras", comprasRoutes(comprasController, autenticado));
  app.use(
    "/api/usuarios",
    usuariosRoutes(new UsuariosController(new UsuariosService(repositorios), reseniasService), autenticado),
  );
  app.use("/api/categorias", categoriasRoutes(new CategoriasController(new CategoriasService(repositorios))));
  app.use("/api/organizadores", organizadoresRoutes(new OrganizadoresController(reseniasService)));
  if (!esProduccion) {
    app.use("/api/dev", devRoutes({ restaurarDatos: () => sembrar(repositorios, reloj) }));
  }

  if (config.docsHabilitados) {
    const registro = crearRegistroOpenApi();
    documentarAuth(registro);
    documentarEventos(registro);
    documentarCompras(registro);
    documentarDev(registro);
    montarDocs(app, generarDocumentoOpenApi(registro));
  }

  app.use(rutaNoEncontrada);
  app.use(errorHandler);

  return app;
}
