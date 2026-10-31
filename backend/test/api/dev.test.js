import { describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { crearRepositorios } from "../../src/repositories/index.js";
import { configDePrueba, crearAppDePrueba, SECRETO_PRODUCCION } from "../helpers/app.js";

const configProduccion = configDePrueba({
  NODE_ENV: "production",
  CORS_ORIGINS: "https://aiticketit.com",
  LOG_LEVEL: "silent",
  JWT_SECRET: SECRETO_PRODUCCION,
});

describe("Herramientas de desarrollo", () => {
  it("POST /api/dev/reset restaura los datos de ejemplo", async () => {
    const repositorios = crearRepositorios();
    const app = crearAppDePrueba({ repositorios });

    const antes = await request(app).get("/api/eventos");
    expect(antes.body.data).toEqual([]);

    const res = await request(app).post("/api/dev/reset");

    expect(res.status).toBe(200);
    const despues = await request(app).get("/api/eventos");
    expect(despues.body.data.length).toBeGreaterThan(0);
  });

  it("no existe en producción", async () => {
    const app = createApp({ config: configProduccion });

    const res = await request(app).post("/api/dev/reset");

    expect(res.status).toBe(404);
  });
});
