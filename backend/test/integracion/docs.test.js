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
