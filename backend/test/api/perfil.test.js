import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { Contrasenias } from "../../src/auth/Contrasenias.js";
import { CONTRASENIA_DEMO } from "../../src/data/seed.js";
import { comoUsuario, crearAppDePrueba } from "../helpers/app.js";

describe("Perfil del usuario", () => {
  let app;

  beforeEach(() => {
    app = crearAppDePrueba({ contrasenias: new Contrasenias({ costo: 4 }) });
  });

  describe("PATCH /api/usuarios/me", () => {
    it("actualiza el nombre y el apellido", async () => {
      const res = await request(app)
        .patch("/api/usuarios/me")
        .set(comoUsuario("u-sofia"))
        .send({ nombre: "Sofi", apellido: "Ramírez López" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "u-sofia", nombre: "Sofi", apellido: "Ramírez López" });
      const yo = await request(app).get("/api/usuarios/me").set(comoUsuario("u-sofia"));
      expect(yo.body.nombre).toBe("Sofi");
    });

    it("normaliza el email nuevo y permite iniciar sesión con él", async () => {
      const res = await request(app)
        .patch("/api/usuarios/me")
        .set(comoUsuario("u-sofia"))
        .send({ email: "  Sofi@Nuevo.com " });

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("sofi@nuevo.com");
      const login = await request(app)
        .post("/api/auth/login")
        .send({ email: "sofi@nuevo.com", password: CONTRASENIA_DEMO });
      expect(login.status).toBe(200);
    });

    it("no deja usar el email de otra cuenta", async () => {
      const res = await request(app)
        .patch("/api/usuarios/me")
        .set(comoUsuario("u-sofia"))
        .send({ email: "lucia@aiticketit.com" });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("EMAIL_EN_USO");
    });

    it("rechaza un email inválido, un nombre vacío o un pedido sin cambios", async () => {
      const comoSofia = (body) =>
        request(app).patch("/api/usuarios/me").set(comoUsuario("u-sofia")).send(body);

      expect((await comoSofia({ email: "no-es-un-email" })).status).toBe(400);
      expect((await comoSofia({ nombre: "   " })).status).toBe(400);
      expect((await comoSofia({})).status).toBe(400);
    });

    it("exige estar autenticado", async () => {
      const res = await request(app).patch("/api/usuarios/me").send({ nombre: "X" });

      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/auth/contrasenia", () => {
    const cambiar = (body) =>
      request(app).put("/api/auth/contrasenia").set(comoUsuario("u-sofia")).send(body);

    it("cambia la contraseña y devuelve una sesión nueva", async () => {
      const res = await cambiar({ actual: CONTRASENIA_DEMO, nueva: "otraClave123" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });
      const conNueva = await request(app)
        .post("/api/auth/login")
        .send({ email: "sofia@aiticketit.com", password: "otraClave123" });
      const conVieja = await request(app)
        .post("/api/auth/login")
        .send({ email: "sofia@aiticketit.com", password: CONTRASENIA_DEMO });
      expect(conNueva.status).toBe(200);
      expect(conVieja.status).toBe(401);
    });

    it("cierra las sesiones abiertas en otros dispositivos", async () => {
      const otroDispositivo = await request(app)
        .post("/api/auth/login")
        .send({ email: "sofia@aiticketit.com", password: CONTRASENIA_DEMO });

      await cambiar({ actual: CONTRASENIA_DEMO, nueva: "otraClave123" });
      const refresco = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: otroDispositivo.body.refreshToken });

      expect(refresco.status).toBe(401);
    });

    it("con la contraseña actual equivocada responde 400 con el campo (no 401, que cerraría la sesión)", async () => {
      const res = await cambiar({ actual: "noEsLaClave1", nueva: "otraClave123" });

      expect(res.status).toBe(400);
      expect(res.body.error.detalles).toEqual([{ campo: "actual", mensaje: expect.any(String) }]);
    });

    it("pide una contraseña nueva segura", async () => {
      const res = await cambiar({ actual: CONTRASENIA_DEMO, nueva: "corta" });

      expect(res.status).toBe(400);
    });

    it("exige estar autenticado", async () => {
      const res = await request(app)
        .put("/api/auth/contrasenia")
        .send({ actual: CONTRASENIA_DEMO, nueva: "otraClave123" });

      expect(res.status).toBe(401);
    });
  });
});
