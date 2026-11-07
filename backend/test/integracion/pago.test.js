import request from "supertest";

import { PasarelaPagosFake, TARJETA_RECHAZADA } from "../../src/infra/PasarelaPagosFake.js";
import { comoUsuario, crearAppDePrueba } from "../helpers/app.js";
import { hastaQue, pasarelaEnEspera } from "../helpers/pagos.js";

const SOFIA = "u-sofia";
const VALENTINA = "u-valentina";
const MARTIN = "u-martin";
const TARJETA_SOFIA = "t-sofia-visa";
// c-04: compra PENDIENTE de Sofía por $52.000. c-01: compra CONFIRMADA de Sofía por $70.000.
const PAGO = "/api/compras/c-04/pago";

describe("Pago de una compra", () => {
  let app;
  let pasarelaPagos;

  function usar(pasarela = new PasarelaPagosFake()) {
    pasarelaPagos = pasarela;
    app = crearAppDePrueba({ pasarelaPagos });
  }

  beforeEach(() => usar());

  const pagar = ({ usuario = SOFIA, url = PAGO, tarjetaId = TARJETA_SOFIA, clave } = {}) => {
    const pedido = request(app).post(url).set(comoUsuario(usuario));
    if (clave) pedido.set("Idempotency-Key", clave);
    return pedido.send({ tarjetaId });
  };
  const verCompra = (id = "c-04", usuario = SOFIA) =>
    request(app).get(`/api/compras/${id}`).set(comoUsuario(usuario));
  const verOperacion = (operacionId, { usuario = SOFIA, compraId = "c-04" } = {}) =>
    request(app).get(`/api/compras/${compraId}/pago/${operacionId}`).set(comoUsuario(usuario));
  const resolucion = (operacionId) =>
    hastaQue(async () => {
      const res = await verOperacion(operacionId);
      return res.body.estado !== "PENDIENTE" ? res : null;
    });

  describe("POST /api/compras/:id/pago", () => {
    it("responde 202 con el id de la operación, sin esperar a la pasarela", async () => {
      usar(pasarelaEnEspera());

      const res = await pagar();

      expect(res.status).toBe(202);
      expect(res.body).toMatchObject({ compraId: "c-04", estado: "PENDIENTE", motivo: null });
      expect(res.headers.location).toBe(`/api/compras/c-04/pago/${res.body.operacionId}`);
      expect(pasarelaPagos.operaciones).toEqual([]);
    });

    it("mientras se procesa, la compra sigue PENDIENTE y no se puede pagar ni cancelar", async () => {
      usar(pasarelaEnEspera());

      const { body } = await pagar();
      const compra = await verCompra();

      expect(compra.body.estado).toBe("PENDIENTE");
      expect(compra.body.operacionPago).toMatchObject({ operacionId: body.operacionId, estado: "PENDIENTE" });
      expect(compra.body.acciones).toMatchObject({ pagar: false, cancelar: false });
    });

    it("no inicia un segundo pago mientras hay uno en proceso", async () => {
      usar(pasarelaEnEspera());
      await pagar();

      const res = await pagar();

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("PAGO_EN_PROCESO");
    });

    it("no deja cancelar mientras hay un pago en proceso: se cobraría una compra cancelada", async () => {
      usar(pasarelaEnEspera());
      await pagar();

      const res = await request(app).post("/api/compras/c-04/cancelacion").set(comoUsuario(SOFIA));

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("PAGO_EN_PROCESO");
    });

    it("no inicia dos pagos si llegan dos requests simultáneas", async () => {
      const [a, b] = await Promise.all([pagar(), pagar()]);

      expect([a.status, b.status].sort()).toEqual([202, 409]);
      const { body } = a.status === 202 ? a : b;
      await resolucion(body.operacionId);
      expect(pasarelaPagos.operaciones).toHaveLength(1);
    });

    it("no cobra si la compra no se puede pagar", async () => {
      const res = await pagar({ url: "/api/compras/c-01/pago" });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("TRANSICION_INVALIDA");
      expect(pasarelaPagos.operaciones).toEqual([]);
    });

    it("solo el comprador puede pagar", async () => {
      const res = await pagar({ usuario: MARTIN });

      expect(res.status).toBe(403);
    });

    it("pide una tarjeta, y tiene que ser del comprador", async () => {
      const sinTarjeta = await pagar({ tarjetaId: "" });
      const ajena = await pagar({ tarjetaId: "t-valentina-master" });

      expect(sinTarjeta.status).toBe(400);
      expect(ajena.status).toBe(404);
      expect(pasarelaPagos.operaciones).toEqual([]);
    });
  });

  describe("GET /api/compras/:id/pago/:operacionId", () => {
    it("cuando la pasarela aprueba, la operación queda APROBADA y la compra CONFIRMADA", async () => {
      const { body } = await pagar();

      const res = await resolucion(body.operacionId);
      const compra = await verCompra();

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ operacionId: body.operacionId, estado: "APROBADA", motivo: null });
      expect(res.body.fechaResolucion).toEqual(expect.any(String));
      expect(compra.body.estado).toBe("CONFIRMADA");
      expect(compra.body.diasRestantes).toBeGreaterThan(0);
      expect(pasarelaPagos.operaciones).toEqual([expect.objectContaining({ tipo: "COBRO", monto: 52000 })]);
    });

    it("sigue PENDIENTE hasta que la pasarela resuelve", async () => {
      const pasarela = pasarelaEnEspera();
      usar(pasarela);
      const { body } = await pagar();

      expect((await verOperacion(body.operacionId)).body.estado).toBe("PENDIENTE");

      pasarela.liberar();
      expect((await resolucion(body.operacionId)).body.estado).toBe("APROBADA");
    });

    it("si rechaza la tarjeta, la operación queda RECHAZADA y la compra sigue pendiente", async () => {
      const tarjeta = await request(app).post("/api/usuarios/me/tarjetas").set(comoUsuario(SOFIA)).send({
        numero: TARJETA_RECHAZADA,
        vencimiento: "12/30",
        cvv: "123",
        titular: "Sofía Ramírez",
      });
      const { body } = await pagar({ tarjetaId: tarjeta.body.id });

      const res = await resolucion(body.operacionId);
      const compra = await verCompra();

      expect(res.body).toMatchObject({ estado: "RECHAZADA", motivo: { codigo: "PAGO_RECHAZADO" } });
      expect(res.body.motivo.mensaje).toEqual(expect.any(String));
      expect(compra.body.estado).toBe("PENDIENTE");
      expect(compra.body.acciones).toMatchObject({ pagar: true, cancelar: true });
      expect(pasarelaPagos.operaciones).toEqual([]);
    });

    it("después de un rechazo se puede volver a pagar con otra tarjeta", async () => {
      const rechazada = await request(app)
        .post("/api/usuarios/me/tarjetas")
        .set(comoUsuario(SOFIA))
        .send({ numero: TARJETA_RECHAZADA, vencimiento: "12/30", cvv: "123", titular: "Sofía Ramírez" });
      const primero = await pagar({ tarjetaId: rechazada.body.id });
      await resolucion(primero.body.operacionId);

      const segundo = await pagar();
      const res = await resolucion(segundo.body.operacionId);

      expect(res.body.estado).toBe("APROBADA");
      expect((await verCompra()).body.estado).toBe("CONFIRMADA");
    });

    it("si la pasarela no responde, la operación lo informa y la compra queda pendiente", async () => {
      pasarelaPagos.cambiarDisponibilidad(false);
      const { body } = await pagar();

      const res = await resolucion(body.operacionId);
      const compra = await verCompra();

      expect(res.body).toMatchObject({ estado: "RECHAZADA", motivo: { codigo: "PASARELA_NO_DISPONIBLE" } });
      expect(compra.body.estado).toBe("PENDIENTE");
    });

    it("si la pasarela falla con un error inesperado, lo trata como no disponible", async () => {
      const pasarela = new PasarelaPagosFake();
      pasarela.cobrar = async () => {
        throw new Error("timeout de red");
      };
      usar(pasarela);
      const { body } = await pagar();

      const res = await resolucion(body.operacionId);

      expect(res.body.motivo.codigo).toBe("PASARELA_NO_DISPONIBLE");
      expect(JSON.stringify(res.body)).not.toContain("timeout de red");
    });

    it("exige estar autenticado", async () => {
      const res = await request(app).get("/api/compras/c-04/pago/op-1");

      expect(res.status).toBe(401);
    });

    it("solo la ve el comprador, ni siquiera el organizador", async () => {
      const { body } = await pagar();

      const otra = await verOperacion(body.operacionId, { usuario: VALENTINA });
      const organizador = await verOperacion(body.operacionId, { usuario: MARTIN });

      expect(otra.status).toBe(403);
      expect(organizador.status).toBe(403);
    });

    it("el organizador tampoco ve la operación en el detalle de la compra", async () => {
      await pagar();

      const compra = await verCompra("c-04", MARTIN);

      expect(compra.body.operacionPago).toBeNull();
    });

    it("responde 404 si la operación no existe o es de otra compra", async () => {
      const { body } = await pagar();

      const inexistente = await verOperacion("no-existe");
      const deOtraCompra = await verOperacion(body.operacionId, { compraId: "c-01" });

      expect(inexistente.status).toBe(404);
      expect(deOtraCompra.status).toBe(404);
    });
  });

  describe("Idempotency-Key", () => {
    it("con la misma clave, repite la respuesta y cobra una sola vez", async () => {
      const primera = await pagar({ clave: "intencion-1" });
      await resolucion(primera.body.operacionId);

      const segunda = await pagar({ clave: "intencion-1" });

      expect(segunda.status).toBe(202);
      expect(segunda.body).toEqual(primera.body);
      expect(segunda.headers.location).toBe(primera.headers.location);
      expect(segunda.headers["idempotent-replayed"]).toBe("true");
      expect(pasarelaPagos.operaciones).toHaveLength(1);
    });

    it("sin repetir la clave, la primera respuesta no se marca como repetida", async () => {
      const res = await pagar({ clave: "intencion-1" });

      expect(res.headers["idempotent-replayed"]).toBeUndefined();
    });

    it("si llegan dos requests juntas con la misma clave, cobra una sola vez", async () => {
      const [a, b] = await Promise.all([pagar({ clave: "juntas" }), pagar({ clave: "juntas" })]);
      const { body } = a.status === 202 ? a : b;

      await resolucion(body.operacionId);

      expect(pasarelaPagos.operaciones).toHaveLength(1);
    });

    it("rechaza la misma clave con otros datos: es un error del cliente, no un reintento", async () => {
      await pagar({ clave: "intencion-1" });

      const res = await pagar({ clave: "intencion-1", tarjetaId: "otra-tarjeta" });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("CLAVE_IDEMPOTENCIA_REUTILIZADA");
    });

    it("la clave es por usuario: otra persona puede usar la misma", async () => {
      await pagar({ clave: "compartida" });

      const res = await request(app)
        .post("/api/compras/c-05/cancelacion")
        .set(comoUsuario(VALENTINA))
        .set("Idempotency-Key", "compartida");

      expect(res.status).not.toBe(409);
      expect(res.body.error?.codigo).not.toBe("CLAVE_IDEMPOTENCIA_REUTILIZADA");
    });

    it("una respuesta de error no se guarda: reintentar con la misma clave vuelve a evaluar", async () => {
      const ajena = await pagar({ clave: "reintento", tarjetaId: "t-valentina-master" });
      expect(ajena.status).toBe(404);

      const sinCambios = await pagar({ clave: "reintento", tarjetaId: "t-valentina-master" });

      expect(sinCambios.status).toBe(404);
      expect(sinCambios.headers["idempotent-replayed"]).toBeUndefined();
    });

    it("rechaza una clave demasiado larga", async () => {
      const res = await pagar({ clave: "x".repeat(256) });

      expect(res.status).toBe(400);
      expect(res.body.error.detalles[0]).toMatchObject({ ubicacion: "headers", campo: "idempotency-key" });
    });
  });

  describe("Cancelación con Idempotency-Key", () => {
    const cancelar = (clave, { url = "/api/compras/c-01/cancelacion", app: aplicacion = app } = {}) =>
      request(aplicacion).post(url).set(comoUsuario(SOFIA)).set("Idempotency-Key", clave);

    it("con la misma clave, repite la respuesta y reembolsa una sola vez", async () => {
      const primera = await cancelar("cancelar-1");

      const segunda = await cancelar("cancelar-1");

      expect(segunda.status).toBe(200);
      expect(segunda.body).toEqual(primera.body);
      expect(segunda.body.estado).toBe("REEMBOLSADA");
      expect(segunda.headers["idempotent-replayed"]).toBe("true");
      expect(pasarelaPagos.operaciones.filter((o) => o.tipo === "REEMBOLSO")).toHaveLength(1);
    });

    it("si el reembolso falló, la misma clave lo vuelve a intentar", async () => {
      pasarelaPagos.cambiarDisponibilidad(false);
      const fallida = await cancelar("cancelar-2");
      expect(fallida.status).toBe(503);

      pasarelaPagos.cambiarDisponibilidad(true);
      const reintento = await cancelar("cancelar-2");

      expect(reintento.status).toBe(200);
      expect(reintento.body.estado).toBe("REEMBOLSADA");
    });

    it("sin clave sigue funcionando", async () => {
      const res = await request(app).post("/api/compras/c-01/cancelacion").set(comoUsuario(SOFIA));

      expect(res.body.estado).toBe("REEMBOLSADA");
    });
  });

  it("el organizador sí ve el resultado en la compra una vez confirmada", async () => {
    const { body } = await pagar();
    await resolucion(body.operacionId);

    const compra = await verCompra("c-04", MARTIN);

    expect(compra.body.estado).toBe("CONFIRMADA");
    expect(compra.body.acciones.validar).toBe(true);
  });
});
