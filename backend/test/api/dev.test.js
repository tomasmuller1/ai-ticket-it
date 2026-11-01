import { describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { CONTRASENIA_DEMO } from "../../src/data/seed.js";
import { crearRepositorios } from "../../src/repositories/index.js";
import { comoUsuario, configDePrueba, crearAppDePrueba, SECRETO_PRODUCCION } from "../helpers/app.js";

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

describe("Simular la caída de la pasarela de pagos", () => {
  it("POST /api/dev/pasarela la apaga y la prende; mientras está apagada no se puede pagar", async () => {
    const app = crearAppDePrueba();
    const pagar = () =>
      request(app)
        .post("/api/compras/c-04/pago")
        .set(comoUsuario("u-sofia"))
        .send({ tarjetaId: "t-sofia-visa" });

    const apagada = await request(app).post("/api/dev/pasarela").send({ disponible: false });
    expect(apagada.body).toEqual({ disponible: false });
    expect((await pagar()).status).toBe(503);
    expect((await request(app).get("/api/eventos")).status).toBe(200);

    await request(app).post("/api/dev/pasarela").send({ disponible: true });
    expect((await pagar()).status).toBe(200);
  });

  it("no existe en producción", async () => {
    const res = await request(createApp({ config: configProduccion }))
      .post("/api/dev/pasarela")
      .send({ disponible: false });

    expect(res.status).toBe(404);
  });
});

describe("Datos iniciales en producción", () => {
  const app = createApp({ config: configProduccion });

  it("no carga los usuarios de ejemplo, que tienen una contraseña pública", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "lucia@aiticketit.com", password: CONTRASENIA_DEMO });
    const eventos = await request(app).get("/api/eventos");

    expect(login.status).toBe(401);
    expect(eventos.body.total).toBe(0);
  });

  it("carga las categorías, sin las que no se podría crear ningún evento", async () => {
    const res = await request(app).get("/api/categorias");

    expect(res.body).toHaveLength(6);
  });
});
