import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { Contrasenias } from "../../src/auth/Contrasenias.js";
import { CONTRASENIA_DEMO } from "../../src/data/seed.js";
import { comoUsuario, configDePrueba, crearAppDePrueba } from "../helpers/app.js";
import { HOY } from "../helpers/fabricas.js";

// Reloj que se puede adelantar para probar vencimientos.
class RelojMovil {
  constructor(fecha) {
    this.fecha = new Date(fecha);
  }

  ahora() {
    return new Date(this.fecha);
  }

  adelantarMinutos(minutos) {
    this.fecha = new Date(this.fecha.getTime() + minutos * 60 * 1000);
  }
}

describe("Autenticación", () => {
  let app;
  let reloj;

  beforeEach(() => {
    reloj = new RelojMovil(HOY);
    // Costo bajo de bcrypt solo para que los tests de registro sean rápidos.
    app = crearAppDePrueba({ reloj, contrasenias: new Contrasenias({ costo: 4 }) });
  });

  const login = (email, password = CONTRASENIA_DEMO) =>
    request(app).post("/api/auth/login").send({ email, password });
  const refrescar = (refreshToken) => request(app).post("/api/auth/refresh").send({ refreshToken });
  const yo = (accessToken) =>
    request(app).get("/api/usuarios/me").set("Authorization", `Bearer ${accessToken}`);

  describe("login", () => {
    it("inicia sesión con email y contraseña y el access token da acceso a la API", async () => {
      const res = await login("sofia@aiticketit.com");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        usuario: { id: "u-sofia", email: "sofia@aiticketit.com" },
      });
      expect(new Date(res.body.accessTokenExpiraEn) - new Date(HOY)).toBe(15 * 60 * 1000);
      expect((await yo(res.body.accessToken)).body.id).toBe("u-sofia");
    });

    it("no distingue mayúsculas en el email", async () => {
      expect((await login("  Sofia@AITicketIt.com ")).status).toBe(200);
    });

    it("responde lo mismo si el email no existe o la contraseña es incorrecta", async () => {
      const malaClave = await login("sofia@aiticketit.com", "otra-clave");
      const sinCuenta = await login("nadie@aiticketit.com");

      expect(malaClave.status).toBe(401);
      expect(sinCuenta.status).toBe(401);
      expect(malaClave.body).toEqual(sinCuenta.body);
      expect(malaClave.body.error.mensaje).toBe("Email o contraseña incorrectos");
    });

    it("nunca expone el hash de la contraseña", async () => {
      const res = await login("sofia@aiticketit.com");

      expect(JSON.stringify(res.body)).not.toContain("$2b$");
      expect(JSON.stringify((await yo(res.body.accessToken)).body)).not.toContain("$2b$");
    });

    it("limita los intentos por IP", async () => {
      const limitada = crearAppDePrueba({
        config: configDePrueba({ AUTH_INTENTOS_MAXIMOS: "2" }),
      });
      const intentar = () =>
        request(limitada).post("/api/auth/login").send({ email: "x@x.com", password: "mala" });

      await intentar();
      await intentar();
      const res = await intentar();

      expect(res.status).toBe(429);
      expect(res.body.error.codigo).toBe("DEMASIADOS_INTENTOS");
    });
  });

  describe("registro", () => {
    const nuevo = { nombre: "Juan", apellido: "Paz", email: "Juan@Mail.com", password: "clave1234" };

    it("crea la cuenta e inicia sesión", async () => {
      const res = await request(app).post("/api/auth/registro").send(nuevo);

      expect(res.status).toBe(201);
      expect(res.body.usuario).toMatchObject({ nombre: "Juan", email: "juan@mail.com" });
      expect((await login("juan@mail.com", "clave1234")).status).toBe(200);
    });

    it("no permite dos cuentas con el mismo email", async () => {
      const res = await request(app)
        .post("/api/auth/registro")
        .send({ ...nuevo, email: "SOFIA@aiticketit.com" });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("EMAIL_EN_USO");
    });

    it("exige una contraseña de al menos 8 caracteres con letras y números", async () => {
      for (const password of ["corta1", "solamenteletras", "1234567890"]) {
        const res = await request(app)
          .post("/api/auth/registro")
          .send({ ...nuevo, password });
        expect(res.status, password).toBe(400);
      }
    });
  });

  describe("rutas protegidas", () => {
    it("sin token, con un token inválido o con otro esquema responden 401", async () => {
      expect((await request(app).get("/api/usuarios/me")).status).toBe(401);
      expect((await yo("no-es-un-jwt")).status).toBe(401);
      expect((await request(app).get("/api/usuarios/me").set("Authorization", "Basic abc")).status).toBe(401);
    });

    it("un token firmado con otro secreto no sirve", async () => {
      const otraApp = crearAppDePrueba({ config: configDePrueba({ JWT_SECRET: "y".repeat(40) }) });

      const res = await request(otraApp).get("/api/usuarios/me").set(comoUsuario("u-sofia"));

      expect(res.status).toBe(401);
    });

    it("el access token vence a los 15 minutos", async () => {
      const { accessToken } = (await login("sofia@aiticketit.com")).body;

      reloj.adelantarMinutos(14);
      expect((await yo(accessToken)).status).toBe(200);
      reloj.adelantarMinutos(2);
      expect((await yo(accessToken)).status).toBe(401);
    });
  });

  describe("refresh y logout", () => {
    it("cambia el refresh token por una sesión nueva", async () => {
      const sesion = (await login("sofia@aiticketit.com")).body;
      reloj.adelantarMinutos(20);

      const res = await refrescar(sesion.refreshToken);

      expect(res.status).toBe(200);
      expect(res.body.refreshToken).not.toBe(sesion.refreshToken);
      expect((await yo(res.body.accessToken)).status).toBe(200);
    });

    it("reutilizar un refresh token cierra toda la sesión", async () => {
      const sesion = (await login("sofia@aiticketit.com")).body;
      const renovada = (await refrescar(sesion.refreshToken)).body;

      const robo = await refrescar(sesion.refreshToken);

      expect(robo.status).toBe(401);
      expect((await refrescar(renovada.refreshToken)).status).toBe(401);
    });

    it("el refresh token vence a los 30 días", async () => {
      const sesion = (await login("sofia@aiticketit.com")).body;
      reloj.adelantarMinutos(30 * 24 * 60 + 1);

      expect((await refrescar(sesion.refreshToken)).status).toBe(401);
    });

    it("cerrar sesión invalida el refresh token", async () => {
      const sesion = (await login("sofia@aiticketit.com")).body;

      const res = await request(app).post("/api/auth/logout").send({ refreshToken: sesion.refreshToken });

      expect(res.status).toBe(204);
      expect((await refrescar(sesion.refreshToken)).status).toBe(401);
    });

    it("un refresh token inventado no sirve", async () => {
      expect((await refrescar("inventado")).status).toBe(401);
    });
  });
});
