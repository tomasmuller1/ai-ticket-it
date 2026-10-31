import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import swaggerUi from "swagger-ui-express";

export function crearRegistroOpenApi() {
  const registro = new OpenAPIRegistry();
  // Mientras no exista la auth con JWT, Swagger permite elegir el usuario con este header.
  registro.registerComponent("securitySchemes", "UsuarioDesarrollo", {
    type: "apiKey",
    in: "header",
    name: "X-Usuario-Id",
    description:
      "Solo desarrollo: id del usuario que hace la request. Usuarios de ejemplo: u-sofia, u-valentina, u-tomas (compradores y organizador), u-lucia y u-martin (organizadores).",
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
