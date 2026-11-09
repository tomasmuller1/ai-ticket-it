import request from "supertest";
import { validate } from "@readme/openapi-parser";

import { createApp } from "../../src/app.js";
import { configDePrueba, crearAppDePrueba, SECRETO_PRODUCCION } from "../helpers/app.js";

describe("Documentación OpenAPI", () => {
  it("publica un documento OpenAPI 3.1 válido", async () => {
    const res = await request(crearAppDePrueba()).get("/api/docs/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
    const resultado = await validate(structuredClone(res.body));
    expect(resultado.errors ?? []).toEqual([]);
    expect(resultado.valid).toBe(true);
  });

  it("documenta todos los endpoints de eventos", async () => {
    const res = await request(crearAppDePrueba()).get("/api/docs/openapi.json");

    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(["/api/eventos", "/api/eventos/{id}"]),
    );
  });

  it("documenta las notificaciones", async () => {
    const res = await request(crearAppDePrueba()).get("/api/docs/openapi.json");

    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        "/api/notificaciones",
        "/api/notificaciones/resumen",
        "/api/notificaciones/lectura",
        "/api/notificaciones/{id}/lectura",
      ]),
    );
    expect(res.body.paths["/api/notificaciones"].get.security).toEqual([{ bearerAuth: [] }]);
    expect(res.body.components.schemas.Notificacion.properties.tipo.enum).toContain("MENSAJE_NUEVO");
  });

  it("documenta el pago asincrónico y su clave de idempotencia", async () => {
    const res = await request(crearAppDePrueba()).get("/api/docs/openapi.json");

    const pago = res.body.paths["/api/compras/{id}/pago"].post;
    const cancelacion = res.body.paths["/api/compras/{id}/cancelacion"].post;
    const clave = (operacion) => operacion.parameters.find((p) => p.name === "Idempotency-Key");

    expect(pago.responses[202]).toBeDefined();
    expect(clave(pago)).toMatchObject({ in: "header", required: false });
    expect(clave(cancelacion)).toMatchObject({ in: "header", required: false });
    expect(clave(res.body.paths["/api/compras"].post)).toMatchObject({ in: "header", required: false });
    expect(res.body.paths["/api/compras/{id}/pago/{operacionId}"].get.responses[200]).toBeDefined();
  });

  it("documenta posponer y cancelar un evento con clave de idempotencia", async () => {
    const res = await request(crearAppDePrueba()).get("/api/docs/openapi.json");

    const posponer = res.body.paths["/api/eventos/{id}/postergacion"].post;
    const cancelar = res.body.paths["/api/eventos/{id}/cancelacion"].post;
    const clave = (operacion) => operacion.parameters.find((p) => p.name === "Idempotency-Key");
    const { schemas } = res.body.components;

    for (const operacion of [posponer, cancelar]) {
      expect(clave(operacion)).toMatchObject({ in: "header", required: false });
      expect(operacion.security).toEqual([{ bearerAuth: [] }]);
      expect(Object.keys(operacion.responses)).toEqual(
        expect.arrayContaining(["200", "400", "401", "403", "404", "409"]),
      );
      expect(operacion.responses[200].content["application/json"].schema.$ref).toBe(
        "#/components/schemas/EventoDeOrganizador",
      );
    }
    expect(posponer.description).toMatch(/UTILIZADAS vuelven a CONFIRMADA/);
    expect(res.body.paths["/api/compras/{id}/resenia"].post.responses[409].description).toMatch(
      /EVENTO_CANCELADO/,
    );
    expect(posponer.requestBody.required).toBe(true);
    expect(cancelar.requestBody.required).toBe(false);
    expect(schemas.PosponerEvento.required).toEqual(["fecha"]);
    expect(schemas.EventoDeOrganizador.properties.estado.enum).toEqual([
      "PROGRAMADO",
      "POSPUESTO",
      "CANCELADO",
    ]);
    expect(schemas.EventoResumen.properties.estado.enum).toEqual(["PROGRAMADO", "POSPUESTO", "CANCELADO"]);
  });

  it("documenta qué pasa con las compras y la búsqueda de un evento cancelado", async () => {
    const res = await request(crearAppDePrueba()).get("/api/docs/openapi.json");

    const { paths } = res.body;
    const conflicto = (path) => paths[path].post.responses[409].description;

    for (const path of [
      "/api/compras",
      "/api/compras/{id}/pago",
      "/api/compras/{id}/cancelacion",
      "/api/compras/{id}/uso",
    ]) {
      expect(conflicto(path)).toMatch(/EVENTO_CANCELADO/);
    }
    expect(paths["/api/compras/{id}/cancelacion"].post.description).toMatch(/el evento se canceló/);
    expect(paths["/api/eventos"].get.description).toMatch(/cancelados/);
    expect(paths["/api/notificaciones"].get.description).toMatch(/se pospone o se cancela un evento/);
  });

  it("documenta la diferencia entre el plazo cumplido y la reserva vencida", async () => {
    const res = await request(crearAppDePrueba()).get("/api/docs/openapi.json");

    const { reservaVencida, reservaPlazoCumplido } = res.body.components.schemas.Compra.properties;

    expect(reservaVencida).toMatchObject({ type: "boolean" });
    expect(reservaVencida.description).toMatch(/CANCELADA/);
    expect(reservaPlazoCumplido).toMatchObject({ type: "boolean" });
    expect(reservaPlazoCumplido.description).toMatch(/PENDIENTE/);
  });

  it("sirve Swagger UI en /api/docs", async () => {
    const res = await request(crearAppDePrueba()).get("/api/docs/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });

  it("no expone la documentación en producción", async () => {
    const config = configDePrueba({
      NODE_ENV: "production",
      CORS_ORIGINS: "https://aiticketit.com",
      LOG_LEVEL: "silent",
      JWT_SECRET: SECRETO_PRODUCCION,
    });
    const res = await request(createApp({ config })).get("/api/docs/openapi.json");

    expect(res.status).toBe(404);
  });
});
