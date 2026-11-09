import request from "supertest";

import { PasarelaPagosFake } from "../../src/infra/PasarelaPagosFake.js";
import { formatearFecha } from "../../src/utils/formato.js";
import { comoUsuario, crearAppDePrueba } from "../helpers/app.js";
import { hastaQue, pasarelaEnEspera } from "../helpers/pagos.js";

// Datos del seed: Lucía organiza e-rock-nacional, que tiene c-01 (Sofía, 2 Campo, CONFIRMADA, $ 70.000),
// c-02 (Tomás, 2 VIP, CONFIRMADA, $ 180.000) y c-03 (Valentina, 1 VIP, PENDIENTE, $ 90.000). e-tango, también
// de Lucía, ya se realizó. Martín organiza otros eventos y acá compra.
const SOFIA = "u-sofia";
const VALENTINA = "u-valentina";
const TOMAS = "u-tomas";
const LUCIA = "u-lucia";
const MARTIN = "u-martin";
const EVENTO = "e-rock-nacional";
const NOMBRE = "Noche de Rock Nacional";
// Posterior a la fecha del seed (12 días después de HOY). En Buenos Aires: "Sáb 5 dic, 21:00".
const NUEVA_FECHA = "2026-12-05T21:00:00-03:00";

describe("Gestión de eventos: posponer y cancelar", () => {
  let app;
  let pasarelaPagos;

  function usar(pasarela = new PasarelaPagosFake()) {
    pasarelaPagos = pasarela;
    app = crearAppDePrueba({ pasarelaPagos });
  }

  beforeEach(() => usar());

  const como = (usuario) => ({
    get: (url) => request(app).get(url).set(comoUsuario(usuario)),
    post: (url, body, headers = {}) => {
      const pedido = request(app).post(url).set(comoUsuario(usuario)).set(headers);
      return body === undefined ? pedido : pedido.send(body);
    },
  });
  const posponer = (body, { usuario = LUCIA, headers } = {}) =>
    como(usuario).post(`/api/eventos/${EVENTO}/postergacion`, body, headers);
  const cancelar = (body, { usuario = LUCIA, headers } = {}) =>
    como(usuario).post(`/api/eventos/${EVENTO}/cancelacion`, body, headers);
  const detalle = async () => (await request(app).get(`/api/eventos/${EVENTO}`)).body;
  const comprasDelEvento = async () => (await como(LUCIA).get(`/api/eventos/${EVENTO}/compras`)).body;
  const estados = (compras) => Object.fromEntries(compras.map((compra) => [compra.id, compra.estado]));
  const historial = (compra) => compra.historial.map((cambio) => [cambio.estado, cambio.quien?.id ?? null]);
  // Las notificaciones de este evento con ese tipo (el seed tiene otras, de otros eventos y del chat).
  const avisosDe = async (usuario, tipo) => {
    const res = await como(usuario).get("/api/notificaciones?pageSize=50");
    return res.body.data.filter((n) => n.evento.id === EVENTO && n.tipo === tipo);
  };

  describe("POST /api/eventos/:id/postergacion", () => {
    it("el organizador pospone: cambia la fecha, avisa a cada compra vigente y las entradas siguen CONFIRMADAS", async () => {
      const deMartin = await como(MARTIN).post("/api/compras", {
        eventoId: EVENTO,
        tipoEntradaId: "e-rock-nacional-platea",
        cantidad: 1,
      });
      await como(MARTIN).post(`/api/compras/${deMartin.body.id}/cancelacion`);
      const fechaAnterior = formatearFecha((await detalle()).fecha);

      const res = await posponer({ fecha: NUEVA_FECHA, motivo: "  Cambió la disponibilidad del estadio.  " });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: EVENTO,
        estado: "POSPUESTO",
        fecha: new Date(NUEVA_FECHA).toISOString(),
        finalizado: false,
      });
      expect(estados((await comprasDelEvento()).compras)).toEqual({
        "c-01": "CONFIRMADA",
        "c-02": "CONFIRMADA",
        "c-03": "PENDIENTE",
        [deMartin.body.id]: "CANCELADA",
      });
      expect((await como(SOFIA).get("/api/compras/c-01")).body.evento).toMatchObject({
        estado: "POSPUESTO",
        fecha: new Date(NUEVA_FECHA).toISOString(),
      });
      const cambio = `La nueva fecha es Sáb 5 dic, 21:00 (era ${fechaAnterior}).`;
      const motivo = "Motivo: Cambió la disponibilidad del estadio.";
      expect(await avisosDe(SOFIA, "EVENTO_POSPUESTO")).toEqual([
        {
          id: expect.any(String),
          tipo: "EVENTO_POSPUESTO",
          titulo: `${NOMBRE} se pospuso`,
          cuerpo: `${cambio} Tu entrada sigue valiendo; si no podés ir, cancelá la compra y te devolvemos el dinero. ${motivo}`,
          fechaHora: expect.any(String),
          leida: false,
          evento: { id: EVENTO, nombre: NOMBRE },
          compraId: "c-01",
        },
      ]);
      expect(await avisosDe(VALENTINA, "EVENTO_POSPUESTO")).toEqual([
        expect.objectContaining({
          cuerpo: `${cambio} Si todavía querés ir, completá el pago antes de que venza tu reserva. ${motivo}`,
          compraId: "c-03",
        }),
      ]);
      expect((await avisosDe(TOMAS, "EVENTO_POSPUESTO")).map((n) => n.compraId)).toEqual(["c-02"]);
      expect(await avisosDe(MARTIN, "EVENTO_POSPUESTO")).toEqual([]);
      expect(await avisosDe(LUCIA, "EVENTO_POSPUESTO")).toEqual([]);
    });

    it("al posponer, una entrada ya validada vuelve a CONFIRMADA, el organizador la puede volver a validar y el comprador recibe el aviso de que sigue valiendo", async () => {
      await como(LUCIA).post("/api/compras/c-02/uso");

      const res = await posponer({ fecha: NUEVA_FECHA });

      expect(res.status).toBe(200);
      const deTomas = (await como(TOMAS).get("/api/compras/c-02")).body;
      expect(deTomas.estado).toBe("CONFIRMADA");
      expect(historial(deTomas)).toEqual([
        ["PENDIENTE", TOMAS],
        ["CONFIRMADA", TOMAS],
        ["UTILIZADA", LUCIA],
        ["CONFIRMADA", LUCIA],
      ]);
      expect(deTomas.acciones).toMatchObject({ cancelar: true, reseniar: false });
      expect(await avisosDe(TOMAS, "EVENTO_POSPUESTO")).toEqual([
        expect.objectContaining({
          cuerpo: expect.stringContaining(
            "Tu entrada sigue valiendo; si no podés ir, cancelá la compra y te devolvemos el dinero.",
          ),
          compraId: "c-02",
        }),
      ]);
      const validada = await como(LUCIA).post("/api/compras/c-02/uso");
      expect(validada.status).toBe(200);
      expect(validada.body.estado).toBe("UTILIZADA");
    });

    it("posponer a una fecha anterior responde 400", async () => {
      const anterior = await posponer({ fecha: "2026-11-05T21:00:00-03:00" });
      const sinZonaHoraria = await posponer({ fecha: "2026-12-05T21:00:00" });
      const motivoLargo = await posponer({ fecha: NUEVA_FECHA, motivo: "x".repeat(301) });
      const sinFecha = await posponer({});

      expect(anterior.status).toBe(400);
      expect(anterior.body.error).toMatchObject({
        codigo: "VALIDACION",
        mensaje: "La nueva fecha tiene que ser posterior a la actual",
      });
      expect([sinZonaHoraria.status, motivoLargo.status, sinFecha.status]).toEqual([400, 400, 400]);
      expect((await detalle()).estado).toBe("PROGRAMADO");
      expect(await avisosDe(SOFIA, "EVENTO_POSPUESTO")).toEqual([]);
    });
  });

  describe("errores de posponer y cancelar", () => {
    it("otro usuario no puede posponer ni cancelar: 403", async () => {
      const pospuesto = await posponer({ fecha: NUEVA_FECHA }, { usuario: MARTIN });
      const cancelado = await cancelar(undefined, { usuario: SOFIA });

      expect([pospuesto.status, cancelado.status]).toEqual([403, 403]);
      expect(pospuesto.body.error).toMatchObject({
        codigo: "PROHIBIDO",
        mensaje: "Solo el organizador puede gestionar este evento",
      });
      expect((await detalle()).estado).toBe("PROGRAMADO");
      expect(estados((await comprasDelEvento()).compras)["c-01"]).toBe("CONFIRMADA");
    });

    it("sin sesión: 401", async () => {
      const pospuesto = await request(app)
        .post(`/api/eventos/${EVENTO}/postergacion`)
        .send({ fecha: NUEVA_FECHA });
      const cancelado = await request(app).post(`/api/eventos/${EVENTO}/cancelacion`);

      expect([pospuesto.status, cancelado.status]).toEqual([401, 401]);
      expect((await detalle()).estado).toBe("PROGRAMADO");
    });

    it("evento inexistente: 404", async () => {
      const pospuesto = await como(LUCIA).post("/api/eventos/no-existe/postergacion", { fecha: NUEVA_FECHA });
      const cancelado = await como(LUCIA).post("/api/eventos/no-existe/cancelacion");

      expect([pospuesto, cancelado].map((res) => [res.status, res.body.error.mensaje])).toEqual([
        [404, "No existe el evento no-existe"],
        [404, "No existe el evento no-existe"],
      ]);
    });

    it("no se puede posponer ni cancelar un evento cancelado ni uno que ya se realizó: 409", async () => {
      await cancelar();

      const respuestas = [
        await posponer({ fecha: NUEVA_FECHA }),
        await cancelar(),
        await como(LUCIA).post("/api/eventos/e-tango/postergacion", { fecha: NUEVA_FECHA }),
        await como(LUCIA).post("/api/eventos/e-tango/cancelacion"),
      ];

      expect(respuestas.map((res) => [res.status, res.body.error.codigo])).toEqual([
        [409, "EVENTO_CANCELADO"],
        [409, "EVENTO_CANCELADO"],
        [409, "EVENTO_FINALIZADO"],
        [409, "EVENTO_FINALIZADO"],
      ]);
    });

    it("repetir con la misma Idempotency-Key devuelve lo mismo y no duplica avisos", async () => {
      const posponerConClave = () =>
        posponer({ fecha: NUEVA_FECHA }, { headers: { "Idempotency-Key": "k-posponer" } });
      const cancelarConClave = () => cancelar(undefined, { headers: { "Idempotency-Key": "k-cancelar" } });

      const pospuesto = await posponerConClave();
      const pospuestoDeNuevo = await posponerConClave();
      const cancelado = await cancelarConClave();
      const canceladoDeNuevo = await cancelarConClave();

      expect([pospuesto, pospuestoDeNuevo, cancelado, canceladoDeNuevo].map((res) => res.status)).toEqual([
        200, 200, 200, 200,
      ]);
      expect(pospuestoDeNuevo.headers["idempotent-replayed"]).toBe("true");
      expect(pospuestoDeNuevo.body).toEqual(pospuesto.body);
      expect(pospuesto.body.estado).toBe("POSPUESTO");
      expect(canceladoDeNuevo.headers["idempotent-replayed"]).toBe("true");
      expect(canceladoDeNuevo.body).toEqual(cancelado.body);
      expect(cancelado.body.estado).toBe("CANCELADO");
      expect(await avisosDe(SOFIA, "EVENTO_POSPUESTO")).toHaveLength(1);
      expect(await avisosDe(SOFIA, "EVENTO_CANCELADO")).toHaveLength(1);
      expect(await avisosDe(SOFIA, "REEMBOLSO_REALIZADO")).toHaveLength(1);
      expect(pasarelaPagos.operaciones.filter((o) => o.referencia === "c-01")).toHaveLength(1);
    });

    it("la misma Idempotency-Key con otra fecha responde 409 CLAVE_IDEMPOTENCIA_REUTILIZADA", async () => {
      const headers = { "Idempotency-Key": "k-1" };
      await posponer({ fecha: NUEVA_FECHA }, { headers });

      const res = await posponer({ fecha: "2026-12-06T21:00:00-03:00" }, { headers });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("CLAVE_IDEMPOTENCIA_REUTILIZADA");
      expect((await detalle()).fecha).toBe(new Date(NUEVA_FECHA).toISOString());
      expect(await avisosDe(SOFIA, "EVENTO_POSPUESTO")).toHaveLength(1);
    });
  });

  describe("POST /api/eventos/:id/cancelacion", () => {
    it("el organizador cancela: las pagadas quedan REEMBOLSADAS, las PENDIENTES CANCELADAS y se libera el cupo", async () => {
      // Una entrada ya validada también se reembolsa: el evento no se va a hacer.
      await como(LUCIA).post("/api/compras/c-02/uso");

      const res = await cancelar({ motivo: "Problemas con el estadio." });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: EVENTO, estado: "CANCELADO", vendidas: 0, disponibles: 1104 });
      const { evento, compras, resumenPorTipo } = await comprasDelEvento();
      expect(evento).toMatchObject({ id: EVENTO, estado: "CANCELADO", finalizado: false });
      expect(estados(compras)).toEqual({ "c-01": "REEMBOLSADA", "c-02": "REEMBOLSADA", "c-03": "CANCELADA" });
      expect(resumenPorTipo.map((tipo) => tipo.disponibles)).toEqual(resumenPorTipo.map((tipo) => tipo.cupo));
      expect(pasarelaPagos.operaciones).toHaveLength(2);
      expect(pasarelaPagos.operaciones).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tipo: "REEMBOLSO", referencia: "c-01", monto: 70000 }),
          expect.objectContaining({ tipo: "REEMBOLSO", referencia: "c-02", monto: 180000 }),
        ]),
      );
      const deSofia = (await como(SOFIA).get("/api/compras/c-01")).body;
      expect(historial(deSofia)).toEqual([
        ["PENDIENTE", SOFIA],
        ["CONFIRMADA", SOFIA],
        ["CANCELADA", LUCIA],
        ["REEMBOLSADA", null],
      ]);
      expect(deSofia.evento.estado).toBe("CANCELADO");
      expect(deSofia.acciones).toMatchObject({ pagar: false, cancelar: false, chatear: true });
      expect(historial((await como(TOMAS).get("/api/compras/c-02")).body).map(([estado]) => estado)).toEqual([
        "PENDIENTE",
        "CONFIRMADA",
        "UTILIZADA",
        "CANCELADA",
        "REEMBOLSADA",
      ]);
    });

    it("cancelar avisa 'Se canceló' a cada comprador, con el monto si pagó", async () => {
      await cancelar({ motivo: "Problemas con el estadio." });

      expect(await avisosDe(SOFIA, "EVENTO_CANCELADO")).toEqual([
        expect.objectContaining({
          titulo: `Se canceló ${NOMBRE}`,
          cuerpo: "Te devolvemos $ 70.000 a tu tarjeta. Motivo: Problemas con el estadio.",
          compraId: "c-01",
          leida: false,
        }),
      ]);
      expect(await avisosDe(TOMAS, "EVENTO_CANCELADO")).toEqual([
        expect.objectContaining({
          cuerpo: "Te devolvemos $ 180.000 a tu tarjeta. Motivo: Problemas con el estadio.",
          compraId: "c-02",
        }),
      ]);
      expect(await avisosDe(VALENTINA, "EVENTO_CANCELADO")).toEqual([
        expect.objectContaining({
          cuerpo: "Tu reserva quedó sin efecto y no se te cobró nada. Motivo: Problemas con el estadio.",
          compraId: "c-03",
        }),
      ]);
      expect(await avisosDe(LUCIA, "EVENTO_CANCELADO")).toEqual([]);
    });

    it("una compra CANCELADA no recibe EVENTO_CANCELADO", async () => {
      const deMartin = await como(MARTIN).post("/api/compras", {
        eventoId: EVENTO,
        tipoEntradaId: "e-rock-nacional-platea",
        cantidad: 1,
      });
      await como(MARTIN).post(`/api/compras/${deMartin.body.id}/cancelacion`);

      await cancelar();

      expect(await avisosDe(MARTIN, "EVENTO_CANCELADO")).toEqual([]);
      expect((await como(MARTIN).get(`/api/compras/${deMartin.body.id}`)).body.historial).toHaveLength(2);
    });

    it("una CANCELADA a la espera del reembolso se reembolsa al cancelar el evento", async () => {
      const pasarela = {
        operaciones: [],
        cobrar: async () => ({ transaccionId: "t-1" }),
        reembolsar: async () => {
          throw new Error("pasarela caída");
        },
      };
      usar(pasarela);
      const fallida = await como(SOFIA).post("/api/compras/c-01/cancelacion");
      pasarela.reembolsar = async ({ referencia, monto }) => {
        pasarela.operaciones.push({ tipo: "REEMBOLSO", referencia, monto });
        return { transaccionId: `r-${referencia}` };
      };

      await cancelar();

      const deSofia = (await como(SOFIA).get("/api/compras/c-01")).body;
      expect(fallida.status).toBe(503);
      expect(deSofia.estado).toBe("REEMBOLSADA");
      expect(historial(deSofia)).toEqual([
        ["PENDIENTE", SOFIA],
        ["CONFIRMADA", SOFIA],
        ["CANCELADA", SOFIA],
        ["REEMBOLSADA", null],
      ]);
      expect(pasarela.operaciones.filter((o) => o.referencia === "c-01")).toHaveLength(1);
      expect(await avisosDe(SOFIA, "REEMBOLSO_REALIZADO")).toHaveLength(1);
      expect(await avisosDe(SOFIA, "EVENTO_CANCELADO")).toEqual([]);
    });

    it("y les manda 'Te devolvimos el dinero' a quienes pagaron", async () => {
      await cancelar();

      expect(await avisosDe(SOFIA, "REEMBOLSO_REALIZADO")).toEqual([
        expect.objectContaining({
          titulo: "Te devolvimos el dinero",
          cuerpo: `Reintegramos $ 70.000 de tu compra para ${NOMBRE}.`,
          compraId: "c-01",
        }),
      ]);
      expect((await avisosDe(TOMAS, "REEMBOLSO_REALIZADO")).map((n) => n.compraId)).toEqual(["c-02"]);
      expect(await avisosDe(VALENTINA, "REEMBOLSO_REALIZADO")).toEqual([]);
    });

    it("un evento cancelado no aparece en la búsqueda pero sí en su detalle, con estado CANCELADO", async () => {
      const antes = await request(app).get("/api/eventos").query({ q: "rock" });

      await cancelar();

      const busqueda = await request(app).get("/api/eventos").query({ q: "rock" });
      const todos = await request(app).get("/api/eventos").query({ incluirPasados: "true", pageSize: 50 });
      const favoritos = await como(VALENTINA).get("/api/usuarios/me/favoritos");
      const mios = await como(LUCIA).get("/api/eventos/mios");
      expect(antes.body.data.map((e) => [e.id, e.estado])).toContainEqual([EVENTO, "PROGRAMADO"]);
      expect(busqueda.body.data.map((e) => e.id)).not.toContain(EVENTO);
      expect(todos.body.data.map((e) => e.id)).not.toContain(EVENTO);
      expect(await detalle()).toMatchObject({ id: EVENTO, estado: "CANCELADO" });
      expect(favoritos.body.find((e) => e.id === EVENTO)?.estado).toBe("CANCELADO");
      expect(mios.body.find((e) => e.id === EVENTO)?.estado).toBe("CANCELADO");
    });

    it("no se puede comprar un evento cancelado: 409 EVENTO_CANCELADO", async () => {
      await cancelar();

      const res = await como(SOFIA).post("/api/compras", {
        eventoId: EVENTO,
        tipoEntradaId: "e-rock-nacional-campo",
        cantidad: 1,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        codigo: "EVENTO_CANCELADO",
        mensaje: "El evento fue cancelado",
      });
    });

    it("con la pasarela caída el evento queda cancelado y el barrido reembolsa cuando vuelve", async () => {
      const pasarela = {
        operaciones: [],
        cobrar: async () => ({ transaccionId: "t-1" }),
        reembolsar: async () => {
          throw new Error("pasarela caída");
        },
      };
      usar(pasarela);

      const res = await cancelar();
      const durante = await comprasDelEvento();
      const deSofiaDurante = (await como(SOFIA).get("/api/compras/c-01")).body;
      const avisosDurante = await avisosDe(SOFIA, "REEMBOLSO_REALIZADO");
      const barridoConLaPasarelaCaida = await app.locals.resolverEventosCancelados();
      pasarela.reembolsar = async ({ referencia, monto }) => {
        pasarela.operaciones.push({ tipo: "REEMBOLSO", referencia, monto });
        return { transaccionId: `r-${referencia}` };
      };
      const barrido = await app.locals.resolverEventosCancelados();
      const despues = await comprasDelEvento();
      const otroBarrido = await app.locals.resolverEventosCancelados();

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("CANCELADO");
      expect(estados(durante.compras)).toEqual({
        "c-01": "CANCELADA",
        "c-02": "CANCELADA",
        "c-03": "CANCELADA",
      });
      expect(deSofiaDurante.acciones.reintentarReembolso).toBe(true);
      expect(avisosDurante).toEqual([]);
      expect(barridoConLaPasarelaCaida).toEqual({ resueltas: 0, pendientes: 2 });
      expect(barrido).toEqual({ resueltas: 2, pendientes: 0 });
      expect(estados(despues.compras)).toEqual({
        "c-01": "REEMBOLSADA",
        "c-02": "REEMBOLSADA",
        "c-03": "CANCELADA",
      });
      expect(pasarela.operaciones.map((o) => [o.referencia, o.monto]).sort()).toEqual([
        ["c-01", 70000],
        ["c-02", 180000],
      ]);
      expect(otroBarrido).toEqual({ resueltas: 0, pendientes: 0 });
      expect(await avisosDe(SOFIA, "REEMBOLSO_REALIZADO")).toHaveLength(1);
    });

    it("un pago en vuelo al cancelar termina REEMBOLSADO y sin aviso de pago aprobado", async () => {
      const pasarela = pasarelaEnEspera();
      usar(pasarela);
      const pago = await como(VALENTINA).post("/api/compras/c-03/pago", { tarjetaId: "t-valentina-master" });

      const res = await cancelar();
      const mientrasCobra = (await como(VALENTINA).get("/api/compras/c-03")).body;
      pasarela.liberar();
      const compra = await hastaQue(async () => {
        const { body } = await como(VALENTINA).get("/api/compras/c-03");
        const reembolsos = await avisosDe(VALENTINA, "REEMBOLSO_REALIZADO");
        return body.estado === "REEMBOLSADA" && reembolsos.length > 0 ? body : null;
      });

      expect([pago.status, res.status]).toEqual([202, 200]);
      expect(mientrasCobra.estado).toBe("PENDIENTE");
      expect(historial(compra)).toEqual([
        ["PENDIENTE", VALENTINA],
        ["CONFIRMADA", VALENTINA],
        ["CANCELADA", null],
        ["REEMBOLSADA", null],
      ]);
      expect(compra.operacionPago.estado).toBe("APROBADA");
      expect(
        pasarela.operaciones.filter((o) => o.referencia === "c-03").map((o) => [o.tipo, o.monto]),
      ).toEqual([
        ["COBRO", 90000],
        ["REEMBOLSO", 90000],
      ]);
      expect(await avisosDe(VALENTINA, "PAGO_CONFIRMADO")).toEqual([]);
      expect(await avisosDe(VALENTINA, "EVENTO_CANCELADO")).toEqual([
        expect.objectContaining({
          cuerpo: "Tu pago estaba en proceso: si se llega a acreditar, te devolvemos $ 90.000 a tu tarjeta.",
          compraId: "c-03",
        }),
      ]);
      expect((await comprasDelEvento()).resumenPorTipo.find((t) => t.nombre === "VIP").disponibles).toBe(4);
    });

    it("un pago en vuelo que no se cobra al cancelar termina CANCELADO y sin aviso de rechazo", async () => {
      const pasarela = pasarelaEnEspera();
      usar(pasarela);
      await como(VALENTINA).post("/api/compras/c-03/pago", { tarjetaId: "t-valentina-master" });
      await cancelar();

      pasarela.cambiarDisponibilidad(false);
      pasarela.liberar();
      const compra = await hastaQue(async () => {
        const { body } = await como(VALENTINA).get("/api/compras/c-03");
        return body.estado === "CANCELADA" ? body : null;
      });

      expect(historial(compra)).toEqual([
        ["PENDIENTE", VALENTINA],
        ["CANCELADA", null],
      ]);
      expect(compra.operacionPago.estado).toBe("RECHAZADA");
      expect(compra.acciones).toMatchObject({ pagar: false, reintentarReembolso: false });
      expect(pasarela.operaciones.filter((o) => o.referencia === "c-03")).toEqual([]);
      expect(await avisosDe(VALENTINA, "PAGO_RECHAZADO")).toEqual([]);
    });
  });

  // Una entrada gratis también se confirma con la tarjeta, pero no hay nada que devolver: ni reembolso de $ 0
  // en la pasarela ni avisos que hablen de dinero.
  describe("evento gratis", () => {
    let gratis;
    let compraId;

    beforeEach(async () => {
      gratis = (
        await como(LUCIA).post("/api/eventos", {
          nombre: "Charla abierta",
          descripcion: "Entrada libre y gratuita.",
          categoriaId: "musica",
          fecha: NUEVA_FECHA,
          lugar: "Centro Cultural, CABA",
          tiposEntrada: [{ nombre: "General", precio: 0, cupo: 50 }],
        })
      ).body;
      compraId = (
        await como(SOFIA).post("/api/compras", {
          eventoId: gratis.id,
          tipoEntradaId: gratis.tiposEntrada[0].id,
          cantidad: 2,
        })
      ).body.id;
      await como(SOFIA).post(`/api/compras/${compraId}/pago`, { tarjetaId: "t-sofia-visa" });
      await hastaQue(
        async () => (await como(SOFIA).get(`/api/compras/${compraId}`)).body.estado === "CONFIRMADA",
      );
    });

    const deSofia = async () => (await como(SOFIA).get(`/api/compras/${compraId}`)).body;
    const avisosDeSofia = async (tipo) => {
      const res = await como(SOFIA).get("/api/notificaciones?pageSize=50");
      return res.body.data.filter((n) => n.compraId === compraId && n.tipo === tipo);
    };
    const reembolsos = () => pasarelaPagos.operaciones.filter((o) => o.tipo === "REEMBOLSO");

    it("al cancelar el evento, la compra queda CANCELADA sin reembolso y el aviso dice que no se cobró nada", async () => {
      await como(LUCIA).post(`/api/eventos/${gratis.id}/cancelacion`, {});
      const barrido = await app.locals.resolverEventosCancelados();

      const compra = await deSofia();
      expect(compra.estado).toBe("CANCELADA");
      expect(compra.acciones.reintentarReembolso).toBe(false);
      expect(barrido).toEqual({ resueltas: 0, pendientes: 0 });
      expect(reembolsos()).toEqual([]);
      expect((await avisosDeSofia("EVENTO_CANCELADO")).map((n) => n.cuerpo)).toEqual([
        "Tu reserva quedó sin efecto y no se te cobró nada.",
      ]);
      expect(await avisosDeSofia("REEMBOLSO_REALIZADO")).toEqual([]);
    });

    it("si la cancela el comprador, queda CANCELADA sin pasar por la pasarela ni avisar un reembolso", async () => {
      const res = await como(SOFIA).post(`/api/compras/${compraId}/cancelacion`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ estado: "CANCELADA", acciones: { reintentarReembolso: false } });
      expect(reembolsos()).toEqual([]);
      expect(await avisosDeSofia("REEMBOLSO_REALIZADO")).toEqual([]);
    });
  });
});
