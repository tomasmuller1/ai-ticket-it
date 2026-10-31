import { describe, expect, it } from "vitest";
import request from "supertest";

import { crearAppDePrueba } from "../helpers/app.js";

describe("Sistema", () => {
  const app = crearAppDePrueba();

  it("GET /api/health responde ok", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("agrega headers de seguridad y oculta la tecnología del servidor", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("devuelve un X-Request-Id y respeta el que manda el cliente", async () => {
    const generado = await request(app).get("/api/health");
    const propio = await request(app).get("/api/health").set("X-Request-Id", "req-123");

    expect(generado.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(propio.headers["x-request-id"]).toBe("req-123");
  });

  it("ignora un X-Request-Id con formato inválido y genera uno nuevo", async () => {
    const res = await request(app).get("/api/health").set("X-Request-Id", "x".repeat(500));

    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
