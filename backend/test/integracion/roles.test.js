import request from "supertest";

import { Contrasenias } from "../../src/auth/Contrasenias.js";
import { comoUsuario, crearAppDePrueba } from "../helpers/app.js";

// Comprador y organizador son roles que se eligen al registrarse: cada uno ve y hace cosas distintas.
const COMPRADORA = "u-sofia";
const ORGANIZADORA = "u-lucia";

const NUEVO_EVENTO = {
  nombre: "Recital acústico",
  descripcion: "Una noche tranquila con guitarras.",
  categoriaId: "musica",
  fecha: "2027-03-15T21:00:00-03:00",
  lugar: "La Trastienda, CABA",
  multimedia: [],
  tiposEntrada: [{ nombre: "General", precio: 20000, cupo: 200 }],
};

const REGISTRO = {
  nombre: "Bruno",
  apellido: "Acuña",
  email: "bruno.nuevo@mail.com",
  password: "miClave123",
};

class VerificadorGoogleFalso {
  async verificar() {
    return {
      sub: "google-1",
      email: "nueva@gmail.com",
      emailVerificado: true,
      nombre: "Nueva",
      apellido: "",
    };
  }
}

describe("Roles de usuario", () => {
  let app;

  beforeEach(() => {
    app = crearAppDePrueba({
      contrasenias: new Contrasenias({ costo: 4 }),
      verificadorGoogle: new VerificadorGoogleFalso(),
    });
  });

  const esProhibido = (res) => {
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe("PROHIBIDO");
  };

  describe("registro", () => {
    it.each(["COMPRADOR", "ORGANIZADOR"])(
      "guarda el rol %s elegido y lo devuelve en la sesión",
      async (rol) => {
        const res = await request(app)
          .post("/api/auth/registro")
          .send({ ...REGISTRO, rol });

        expect(res.status).toBe(201);
        expect(res.body.usuario.rol).toBe(rol);
        const yo = await request(app)
          .get("/api/usuarios/me")
          .set("Authorization", `Bearer ${res.body.accessToken}`);
        expect(yo.body.rol).toBe(rol);
      },
    );

    it("exige elegir un rol válido", async () => {
      const sinRol = await request(app).post("/api/auth/registro").send(REGISTRO);
      const otroRol = await request(app)
        .post("/api/auth/registro")
        .send({ ...REGISTRO, rol: "ADMIN" });

      expect(sinRol.status).toBe(400);
      expect(sinRol.body.error.detalles).toEqual(
        expect.arrayContaining([expect.objectContaining({ campo: "rol" })]),
      );
      expect(otroRol.status).toBe(400);
    });

    it("con Google, una cuenta nueva toma el rol elegido y por defecto es compradora", async () => {
      const organizadora = await request(app)
        .post("/api/auth/google")
        .send({ idToken: "x", rol: "ORGANIZADOR" });
      expect(organizadora.body.usuario.rol).toBe("ORGANIZADOR");

      const otraApp = crearAppDePrueba({ verificadorGoogle: new VerificadorGoogleFalso() });
      const compradora = await request(otraApp).post("/api/auth/google").send({ idToken: "x" });
      expect(compradora.body.usuario.rol).toBe("COMPRADOR");
    });

    it("con Google, una cuenta que ya existe conserva su rol", async () => {
      await request(app).post("/api/auth/google").send({ idToken: "x", rol: "ORGANIZADOR" });

      const otraVez = await request(app).post("/api/auth/google").send({ idToken: "x", rol: "COMPRADOR" });

      expect(otraVez.body.usuario.rol).toBe("ORGANIZADOR");
    });
  });

  describe("un comprador", () => {
    const comoCompradora = comoUsuario(COMPRADORA);

    it("no puede publicar eventos ni ver los que organiza", async () => {
      esProhibido(await request(app).post("/api/eventos").set(comoCompradora).send(NUEVO_EVENTO));
      esProhibido(await request(app).get("/api/eventos/mios").set(comoCompradora));
    });

    it("no puede posponer ni cancelar eventos ni ver sus ventas", async () => {
      const posponer = await request(app)
        .post("/api/eventos/e-rock-nacional/postergacion")
        .set(comoCompradora)
        .set("Idempotency-Key", "clave-postergar-1")
        .send({ fecha: "2027-01-10T21:00:00-03:00" });
      const cancelar = await request(app)
        .post("/api/eventos/e-rock-nacional/cancelacion")
        .set(comoCompradora)
        .set("Idempotency-Key", "clave-cancelar-1")
        .send({});

      esProhibido(posponer);
      esProhibido(cancelar);
      esProhibido(await request(app).get("/api/eventos/e-rock-nacional/compras").set(comoCompradora));
    });

    it("no puede validar entradas", async () => {
      esProhibido(await request(app).post("/api/compras/c-01/uso").set(comoCompradora));
    });
  });

  describe("un organizador", () => {
    const comoOrganizadora = comoUsuario(ORGANIZADORA);

    it("puede explorar eventos de otros, pero no comprar entradas", async () => {
      const detalle = await request(app).get("/api/eventos/e-jazz-club").set(comoOrganizadora);
      const compra = await request(app)
        .post("/api/compras")
        .set(comoOrganizadora)
        .set("Idempotency-Key", "clave-compra-1")
        .send({ eventoId: "e-jazz-club", tipoEntradaId: "e-jazz-club-mesa", cantidad: 1 });

      expect(detalle.status).toBe(200);
      esProhibido(compra);
    });

    it("no puede guardar favoritos ni tarjetas", async () => {
      esProhibido(await request(app).put("/api/usuarios/me/favoritos/e-jazz-club").set(comoOrganizadora));
      esProhibido(await request(app).get("/api/usuarios/me/favoritos/ids").set(comoOrganizadora));
      esProhibido(
        await request(app)
          .post("/api/usuarios/me/tarjetas")
          .set(comoOrganizadora)
          .send({ numero: "4111111111111111", titular: "Lucía", vencimiento: "12/30", cvv: "123" }),
      );
    });

    it("no puede reseñar eventos", async () => {
      esProhibido(
        await request(app)
          .post("/api/compras/c-10/resenia")
          .set(comoOrganizadora)
          .send({ puntuacion: 5, detalle: "Muy bueno" }),
      );
    });
  });
});
