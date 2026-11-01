import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { PasarelaPagosFake } from "../../src/infra/PasarelaPagosFake.js";
import { comoUsuario, crearAppDePrueba } from "../helpers/app.js";

const SOFIA = "u-sofia";
const TARJETA_SOFIA = "t-sofia-visa";
const TARJETA_VALENTINA = "t-valentina-master";

describe("Medios de pago", () => {
  let app;
  let pasarelaPagos;
  const como = (usuarioId) => ({
    get: (ruta) => request(app).get(ruta).set(comoUsuario(usuarioId)),
    post: (ruta) => request(app).post(ruta).set(comoUsuario(usuarioId)),
    delete: (ruta) => request(app).delete(ruta).set(comoUsuario(usuarioId)),
  });
  const nueva = {
    numero: "4111 1111 1111 1111",
    vencimiento: "12/30",
    cvv: "123",
    titular: "Sofía Ramírez",
  };

  beforeEach(() => {
    pasarelaPagos = new PasarelaPagosFake();
    app = crearAppDePrueba({ pasarelaPagos });
  });

  it("lista solo mis tarjetas, sin el número completo ni el token", async () => {
    const res = await como(SOFIA).get("/api/usuarios/me/tarjetas");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: TARJETA_SOFIA, marca: "Visa", ultimos4: "4242", vencimiento: "08/29", titular: "Sofía Ramírez" },
    ]);
  });

  it("agrega una tarjeta: la pasarela la tokeniza y solo se guardan la marca y los últimos 4", async () => {
    const res = await como(SOFIA).post("/api/usuarios/me/tarjetas").send(nueva);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      marca: "Visa",
      ultimos4: "1111",
      vencimiento: "12/30",
      titular: "Sofía Ramírez",
    });
    expect(JSON.stringify(res.body)).not.toContain("4111111111111111");
    const lista = await como(SOFIA).get("/api/usuarios/me/tarjetas");
    expect(lista.body).toHaveLength(2);
  });

  it("reconoce Mastercard y American Express por el número", async () => {
    const master = await como(SOFIA)
      .post("/api/usuarios/me/tarjetas")
      .send({ ...nueva, numero: "5555555555554444" });
    const amex = await como(SOFIA)
      .post("/api/usuarios/me/tarjetas")
      .send({ ...nueva, numero: "378282246310005", cvv: "1234" });

    expect(master.body.marca).toBe("Mastercard");
    expect(amex.body.marca).toBe("American Express");
  });

  it("rechaza una tarjeta vencida, un número inválido o un código mal escrito", async () => {
    const vencida = await como(SOFIA)
      .post("/api/usuarios/me/tarjetas")
      .send({ ...nueva, vencimiento: "01/20" });
    const numero = await como(SOFIA)
      .post("/api/usuarios/me/tarjetas")
      .send({ ...nueva, numero: "1234" });
    const cvv = await como(SOFIA)
      .post("/api/usuarios/me/tarjetas")
      .send({ ...nueva, cvv: "12" });

    expect(vencida.status).toBe(400);
    expect(vencida.body.error.detalles).toEqual([{ campo: "vencimiento", mensaje: expect.any(String) }]);
    expect(numero.status).toBe(400);
    expect(cvv.status).toBe(400);
  });

  it("quita una tarjeta propia, pero no la de otra persona", async () => {
    const propia = await como(SOFIA).delete(`/api/usuarios/me/tarjetas/${TARJETA_SOFIA}`);
    const ajena = await como(SOFIA).delete(`/api/usuarios/me/tarjetas/${TARJETA_VALENTINA}`);

    expect(propia.status).toBe(204);
    expect(ajena.status).toBe(404);
  });

  it("si la pasarela no responde, avisa con 503 y no guarda nada", async () => {
    pasarelaPagos.cambiarDisponibilidad(false);

    const res = await como(SOFIA).post("/api/usuarios/me/tarjetas").send(nueva);

    expect(res.status).toBe(503);
    expect(res.body.error.codigo).toBe("PASARELA_NO_DISPONIBLE");
    expect((await como(SOFIA).get("/api/usuarios/me/tarjetas")).body).toHaveLength(1);
  });

  it("exige estar autenticado", async () => {
    expect((await request(app).get("/api/usuarios/me/tarjetas")).status).toBe(401);
  });
});
