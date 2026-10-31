import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import swaggerUi from "swagger-ui-express";

export function crearRegistroOpenApi() {
  const registro = new OpenAPIRegistry();
  registro.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description:
      'Access token de /api/auth/login. Usuarios de ejemplo (contraseña "aiticketit123"): sofia@, valentina@, tomas@, lucia@ y martin@aiticketit.com.',
  });
  return registro;
}

export function generarDocumentoOpenApi(registro) {
  return new OpenApiGeneratorV31(registro.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "AI Ticket It API",
      version: "0.1.0",
      description: "API REST de la plataforma de venta de entradas para eventos.",
    },
    servers: [{ url: "/" }],
  });
}

// Swagger UI en /api/docs y el documento crudo en /api/docs/openapi.json.
export function montarDocs(app, documento) {
  app.get("/api/docs/openapi.json", (req, res) => res.json(documento));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(documento, { customSiteTitle: "AI Ticket It API" }));
}
