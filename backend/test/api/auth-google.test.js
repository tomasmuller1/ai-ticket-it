import { describe, expect, it } from "vitest";
import request from "supertest";

import { comoUsuario, crearAppDePrueba } from "../helpers/app.js";

// Reemplaza a Google en los tests: cada "token" corresponde a un perfil ya verificado.
class VerificadorGoogleFalso {
  constructor(perfiles) {
    this.perfiles = perfiles;
  }

  async verificar(idToken) {
    const perfil = this.perfiles[idToken];
    if (!perfil) throw new Error("Token de Google inválido");
    return perfil;
  }
}

const PERFILES = {
  "token-nuevo": {
    sub: "google-123",
    email: "Marta.Diaz@gmail.com",
    emailVerificado: true,
    nombre: "Marta",
    apellido: "Díaz",
  },
  "token-sofia": {
    sub: "google-sofia",
    email: "sofia@aiticketit.com",
    emailVerificado: true,
    nombre: "Sofía",
    apellido: "Ramírez",
  },
  "token-sin-verificar": {
    sub: "google-999",
    email: "alguien@gmail.com",
    emailVerificado: false,
    nombre: "Alguien",
    apellido: "",
  },
};

function appConGoogle() {
  return crearAppDePrueba({ verificadorGoogle: new VerificadorGoogleFalso(PERFILES) });
}

describe("Inicio de sesión con Google", () => {
  it("crea la cuenta la primera vez y devuelve una sesión", async () => {
    const app = appConGoogle();

    const res = await request(app).post("/api/auth/google").send({ idToken: "token-nuevo" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      usuario: { nombre: "Marta", apellido: "Díaz", email: "marta.diaz@gmail.com" },
    });
    const yo = await request(app).get("/api/usuarios/me").set(comoUsuario(res.body.usuario.id));
    expect(yo.status).toBe(200);
  });

  it("la segunda vez entra a la misma cuenta", async () => {
    const app = appConGoogle();

    const primera = await request(app).post("/api/auth/google").send({ idToken: "token-nuevo" });
    const segunda = await request(app).post("/api/auth/google").send({ idToken: "token-nuevo" });

    expect(segunda.body.usuario.id).toBe(primera.body.usuario.id);
  });

  it("vincula Google a una cuenta existente con el mismo email verificado", async () => {
    const app = appConGoogle();

    const res = await request(app).post("/api/auth/google").send({ idToken: "token-sofia" });

    expect(res.status).toBe(200);
    expect(res.body.usuario.id).toBe("u-sofia");
  });

  it("rechaza un token que Google no valida", async () => {
    const res = await request(appConGoogle()).post("/api/auth/google").send({ idToken: "inventado" });

    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTENTICADO");
  });

  it("rechaza una cuenta de Google con el email sin verificar", async () => {
    const res = await request(appConGoogle())
      .post("/api/auth/google")
      .send({ idToken: "token-sin-verificar" });

    expect(res.status).toBe(401);
  });

  it("valida que llegue el token", async () => {
    const res = await request(appConGoogle()).post("/api/auth/google").send({});

    expect(res.status).toBe(400);
  });

  it("sin credenciales de Google configuradas responde 503", async () => {
    const res = await request(crearAppDePrueba()).post("/api/auth/google").send({ idToken: "token-nuevo" });

    expect(res.status).toBe(503);
    expect(res.body.error.codigo).toBe("SSO_NO_CONFIGURADO");
  });
});
