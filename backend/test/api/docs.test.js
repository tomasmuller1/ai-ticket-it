import { describe, expect, it } from "vitest";
import request from "supertest";
import { validate } from "@readme/openapi-parser";

import { createApp } from "../../src/app.js";
import { configDePrueba, crearAppDePrueba } from "../helpers/app.js";

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
    });
    const res = await request(createApp({ config })).get("/api/docs/openapi.json");

    expect(res.status).toBe(404);
  });
});
