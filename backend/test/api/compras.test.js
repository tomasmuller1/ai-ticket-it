import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { PasarelaPagosFake } from "../../src/infra/PasarelaPagosFake.js";
import { comoUsuario, crearAppDePrueba } from "../helpers/app.js";

// Usuarios del seed: Sofía y Valentina compran; Lucía y Martín organizan; Tomás hace las dos cosas.
const SOFIA = "u-sofia";
const TARJETA_SOFIA = "t-sofia-visa";
const VALENTINA = "u-valentina";
const TOMAS = "u-tomas";
const LUCIA = "u-lucia";
const MARTIN = "u-martin";

describe("Compras", () => {
  let app;
  let pasarelaPagos;

  beforeEach(() => {
    pasarelaPagos = new PasarelaPagosFake();
    app = crearAppDePrueba({ pasarelaPagos });
  });

  const como = (usuario) => ({
    get: (url) => request(app).get(url).set(comoUsuario(usuario)),
    post: (url, body) => request(app).post(url).set(comoUsuario(usuario)).send(body),
    put: (url) => request(app).put(url).set(comoUsuario(usuario)),
    delete: (url) => request(app).delete(url).set(comoUsuario(usuario)),
  });

  const disponibles = async (eventoId, tipo) => {
    const res = await request(app).get(`/api/eventos/${eventoId}`);
    return res.body.tiposEntrada.find((t) => t.nombre === tipo).disponibles;
  };

  describe("POST /api/compras (CU12)", () => {
    it("crea la compra PENDIENTE, calcula el total y reserva el cupo", async () => {
      const antes = await disponibles("e-rock-nacional", "Campo");

      const res = await como(SOFIA).post("/api/compras", {
        eventoId: "e-rock-nacional",
        tipoEntradaId: "e-rock-nacional-campo",
        cantidad: 3,
      });

      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/compras/${res.body.id}`);
      expect(res.body).toMatchObject({
        estado: "PENDIENTE",
        cantidad: 3,
        precioUnitario: 35000,
        total: 105000,
        diasRestantes: null,
        acciones: {
          pagar: true,
          cancelar: true,
          validar: false,
          reseniar: false,
          chatear: true,
          reintentarReembolso: false,
        },
      });
      expect(await disponibles("e-rock-nacional", "Campo")).toBe(antes - 3);
    });

    it("no permite superar el cupo disponible", async () => {
      const res = await como(SOFIA).post("/api/compras", {
        eventoId: "e-rock-nacional",
        tipoEntradaId: "e-rock-nacional-vip",
        cantidad: 2,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toEqual({ codigo: "SIN_CUPO", mensaje: "Quedan 1 entradas VIP" });
    });

    it("no permite que el organizador compre en su propio evento", async () => {
      const res = await como(LUCIA).post("/api/compras", {
        eventoId: "e-rock-nacional",
        tipoEntradaId: "e-rock-nacional-campo",
        cantidad: 1,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("PROPIO_EVENTO");
    });

    it("no permite comprar entradas de un evento que ya se realizó", async () => {
      const res = await como(SOFIA).post("/api/compras", {
        eventoId: "e-tango",
        tipoEntradaId: "e-tango-general",
        cantidad: 1,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("EVENTO_FINALIZADO");
    });

    it("valida los datos de entrada", async () => {
      const otroEvento = await como(SOFIA).post("/api/compras", {
        eventoId: "e-rock-nacional",
        tipoEntradaId: "e-hamlet-platea",
        cantidad: 1,
      });
      const demasiadas = await como(SOFIA).post("/api/compras", {
        eventoId: "e-rock-nacional",
        tipoEntradaId: "e-rock-nacional-campo",
        cantidad: 11,
      });
      const sinEvento = await como(SOFIA).post("/api/compras", {
        eventoId: "no-existe",
        tipoEntradaId: "x",
        cantidad: 1,
      });

      expect(otroEvento.status).toBe(400);
      expect(demasiadas.status).toBe(400);
      expect(sinEvento.status).toBe(404);
    });

    it("exige estar autenticado", async () => {
      const res = await request(app).post("/api/compras").send({});

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/compras (CU1)", () => {
    it("lista mis compras con su estado y los días que faltan si están confirmadas", async () => {
      const res = await como(SOFIA).get("/api/compras");

      expect(res.status).toBe(200);
      expect(res.body.every((c) => c.comprador.id === SOFIA)).toBe(true);
      const rock = res.body.find((c) => c.id === "c-01");
      expect(rock).toMatchObject({ estado: "CONFIRMADA", diasRestantes: 13 });
      expect(res.body.find((c) => c.id === "c-04")).toMatchObject({
        estado: "PENDIENTE",
        diasRestantes: null,
      });
    });

    it("filtra por estado", async () => {
      const res = await como(SOFIA).get("/api/compras?estado=PENDIENTE");

      expect(res.body.map((c) => c.id)).toEqual(["c-04"]);
    });

    it("rechaza un estado inexistente", async () => {
      expect((await como(SOFIA).get("/api/compras?estado=PERDIDA")).status).toBe(400);
    });
  });

  describe("GET /api/compras/:id", () => {
    it("muestra el detalle con historial y código de entrada al comprador", async () => {
      const res = await como(SOFIA).get("/api/compras/c-01");

      expect(res.status).toBe(200);
      expect(res.body.codigoEntrada).toBe("C01");
      expect(res.body.historial.map((h) => h.estado)).toEqual(["PENDIENTE", "CONFIRMADA"]);
      expect(res.body.historial[0].quien).toEqual({ id: SOFIA, nombre: "Sofía Ramírez" });
      expect(res.body.cantidadMensajes).toBe(2);
    });

    it("el organizador también la ve, con la acción de validar la entrada", async () => {
      const res = await como(LUCIA).get("/api/compras/c-01");

      expect(res.status).toBe(200);
      expect(res.body.acciones).toMatchObject({ validar: true, cancelar: false, pagar: false });
    });

    it("nadie más puede verla", async () => {
      expect((await como(VALENTINA).get("/api/compras/c-01")).status).toBe(403);
      expect((await como(SOFIA).get("/api/compras/no-existe")).status).toBe(404);
    });
  });

  describe("POST /api/compras/:id/pago", () => {
    it("cobra con la pasarela y deja la compra CONFIRMADA", async () => {
      const res = await como(SOFIA).post("/api/compras/c-04/pago").send({ tarjetaId: TARJETA_SOFIA });

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("CONFIRMADA");
      expect(res.body.diasRestantes).toBeGreaterThan(0);
      expect(pasarelaPagos.operaciones).toEqual([expect.objectContaining({ tipo: "COBRO", monto: 52000 })]);
    });

    it("no cobra si la compra no se puede pagar", async () => {
      const res = await como(SOFIA).post("/api/compras/c-01/pago").send({ tarjetaId: TARJETA_SOFIA });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("TRANSICION_INVALIDA");
      expect(pasarelaPagos.operaciones).toEqual([]);
    });

    it("solo el comprador puede pagar", async () => {
      const res = await como(MARTIN).post("/api/compras/c-04/pago").send({ tarjetaId: TARJETA_SOFIA });

      expect(res.status).toBe(403);
    });

    it("pide una tarjeta, y tiene que ser del comprador", async () => {
      const sinTarjeta = await como(SOFIA).post("/api/compras/c-04/pago").send({});
      const ajena = await como(SOFIA)
        .post("/api/compras/c-04/pago")
        .send({ tarjetaId: "t-valentina-master" });

      expect(sinTarjeta.status).toBe(400);
      expect(ajena.status).toBe(404);
      expect(pasarelaPagos.operaciones).toEqual([]);
    });

    it("si la pasarela no responde, avisa con 503 y la compra queda pendiente", async () => {
      pasarelaPagos.cambiarDisponibilidad(false);

      const res = await como(SOFIA).post("/api/compras/c-04/pago").send({ tarjetaId: TARJETA_SOFIA });

      expect(res.status).toBe(503);
      expect(res.body.error).toMatchObject({ codigo: "PASARELA_NO_DISPONIBLE", mensaje: expect.any(String) });
      const compra = await como(SOFIA).get("/api/compras/c-04");
      expect(compra.body.estado).toBe("PENDIENTE");
    });
  });

  describe("POST /api/compras/:id/cancelacion (CU7, CU8)", () => {
    it("cancela una compra pagada, la reembolsa y libera el cupo", async () => {
      const antes = await disponibles("e-rock-nacional", "Campo");

      const res = await como(SOFIA).post("/api/compras/c-01/cancelacion");

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("REEMBOLSADA");
      expect(res.body.historial.map((h) => [h.estado, h.quien?.id ?? null])).toEqual([
        ["PENDIENTE", SOFIA],
        ["CONFIRMADA", SOFIA],
        ["CANCELADA", SOFIA],
        ["REEMBOLSADA", null],
      ]);
      expect(pasarelaPagos.operaciones).toEqual([
        expect.objectContaining({ tipo: "REEMBOLSO", referencia: "c-01", monto: 70000 }),
      ]);
      expect(await disponibles("e-rock-nacional", "Campo")).toBe(antes + 2);
    });

    it("si el reembolso falla, la compra queda CANCELADA y cancelar de nuevo lo reintenta", async () => {
      const falla = {
        cobrar: pasarelaPagos.cobrar.bind(pasarelaPagos),
        reembolsar: async () => {
          throw new Error("pasarela caída");
        },
      };
      const appConFalla = crearAppDePrueba({ pasarelaPagos: falla });
      const cancelar = () =>
        request(appConFalla).post("/api/compras/c-01/cancelacion").set(comoUsuario(SOFIA));

      const fallida = await cancelar();
      expect(fallida.status).toBe(503);
      expect(fallida.body.error.codigo).toBe("PASARELA_NO_DISPONIBLE");
      const pendiente = await request(appConFalla).get("/api/compras/c-01").set(comoUsuario(SOFIA));
      expect(pendiente.body.estado).toBe("CANCELADA");
      expect(pendiente.body.acciones).toMatchObject({ cancelar: false, reintentarReembolso: true });

      falla.reembolsar = async () => ({ transaccionId: "r-1" });
      const reintento = await cancelar();
      expect(reintento.status).toBe(200);
      expect(reintento.body.estado).toBe("REEMBOLSADA");
      expect(reintento.body.acciones.reintentarReembolso).toBe(false);
    });

    it("no cobra dos veces si llegan dos pagos simultáneos", async () => {
      const [a, b] = await Promise.all([
        como(SOFIA).post("/api/compras/c-04/pago").send({ tarjetaId: TARJETA_SOFIA }),
        como(SOFIA).post("/api/compras/c-04/pago").send({ tarjetaId: TARJETA_SOFIA }),
      ]);

      expect([a.status, b.status].sort()).toEqual([200, 409]);
      expect(pasarelaPagos.operaciones).toHaveLength(1);
    });

    it("una compra pendiente queda CANCELADA sin reembolso", async () => {
      const res = await como(SOFIA).post("/api/compras/c-04/cancelacion");

      expect(res.body.estado).toBe("CANCELADA");
      expect(pasarelaPagos.operaciones).toEqual([]);
    });

    it("no se puede cancelar una compra utilizada", async () => {
      await como(MARTIN).post("/api/compras/c-05/uso");

      const res = await como(VALENTINA).post("/api/compras/c-05/cancelacion");

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("TRANSICION_INVALIDA");
    });

    it("no se puede cancelar si el evento ya se realizó", async () => {
      const res = await como(TOMAS).post("/api/compras/c-12/cancelacion");

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("EVENTO_FINALIZADO");
    });

    it("el organizador no puede cancelar la compra de otro", async () => {
      expect((await como(LUCIA).post("/api/compras/c-01/cancelacion")).status).toBe(403);
    });
  });

  describe("POST /api/compras/:id/uso", () => {
    it("el organizador valida la entrada y la compra queda UTILIZADA", async () => {
      const res = await como(MARTIN).post("/api/compras/c-05/uso");

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("UTILIZADA");
    });

    it("el comprador no puede validar su propia entrada", async () => {
      expect((await como(SOFIA).post("/api/compras/c-01/uso")).status).toBe(403);
    });
  });

  describe("GET /api/eventos/:id/compras (CU2)", () => {
    it("muestra al organizador las compras y las entradas disponibles por tipo", async () => {
      const res = await como(LUCIA).get("/api/eventos/e-rock-nacional/compras");

      expect(res.status).toBe(200);
      expect(res.body.resumenPorTipo.find((t) => t.nombre === "VIP")).toMatchObject({
        cupo: 4,
        vendidas: 3,
        disponibles: 1,
      });
      expect(res.body.compras.map((c) => c.estado).sort()).toEqual(["CONFIRMADA", "CONFIRMADA", "PENDIENTE"]);
    });

    it("filtra las compras por estado", async () => {
      const res = await como(LUCIA).get("/api/eventos/e-rock-nacional/compras?estado=PENDIENTE");

      expect(res.body.compras.map((c) => c.id)).toEqual(["c-03"]);
    });

    it("solo lo puede ver el organizador del evento", async () => {
      expect((await como(SOFIA).get("/api/eventos/e-rock-nacional/compras")).status).toBe(403);
      expect((await como(LUCIA).get("/api/eventos/no-existe/compras")).status).toBe(404);
    });
  });

  describe("Chat de la compra (CU5, CU6)", () => {
    it("el comprador y el organizador conversan en la compra", async () => {
      const enviado = await como(LUCIA).post("/api/compras/c-01/mensajes", {
        mensaje: "  Recordá traer el DNI  ",
      });
      const res = await como(SOFIA).get("/api/compras/c-01/mensajes");

      expect(enviado.status).toBe(201);
      expect(enviado.body).toMatchObject({ mensaje: "Recordá traer el DNI", esPropio: true });
      expect(res.body.map((m) => [m.autor.id, m.esPropio])).toEqual([
        [SOFIA, true],
        [LUCIA, false],
        [LUCIA, false],
      ]);
    });

    it("con 'desde' devuelve solo los mensajes nuevos", async () => {
      const todos = await como(SOFIA).get("/api/compras/c-01/mensajes");
      const ultimo = todos.body.at(-1).enviado;

      const nuevos = await como(SOFIA).get(`/api/compras/c-01/mensajes?desde=${encodeURIComponent(ultimo)}`);

      // Incluye el del mismo instante para no perder mensajes simultáneos; la app descarta repetidos por id.
      expect(nuevos.body.map((m) => m.id)).toContain(todos.body.at(-1).id);
      expect(nuevos.body.every((m) => m.enviado >= ultimo)).toBe(true);
      expect(nuevos.body.length).toBeLessThan(todos.body.length + 1);
    });

    it("se puede escribir en cualquier estado de la compra", async () => {
      const res = await como(SOFIA).post("/api/compras/c-06/mensajes", {
        mensaje: "¿Me llegó el reembolso?",
      });

      expect(res.status).toBe(201);
    });

    it("nadie más puede leer ni escribir, y el mensaje no puede estar vacío", async () => {
      expect((await como(VALENTINA).get("/api/compras/c-01/mensajes")).status).toBe(403);
      expect((await como(VALENTINA).post("/api/compras/c-01/mensajes", { mensaje: "hola" })).status).toBe(
        403,
      );
      expect((await como(SOFIA).post("/api/compras/c-01/mensajes", { mensaje: "   " })).status).toBe(400);
    });
  });

  describe("POST /api/compras/:id/resenia (CU9)", () => {
    it("el comprador reseña un evento al que asistió y suma a la reputación del organizador", async () => {
      const antes = (await request(app).get("/api/eventos/e-rock-nacional")).body.organizador;

      const res = await como(TOMAS).post("/api/compras/c-12/resenia", {
        puntuacion: 1,
        detalle: "Mal sonido",
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ puntuacion: 1, detalle: "Mal sonido", evento: { id: "e-tango" } });
      const despues = (await request(app).get("/api/eventos/e-rock-nacional")).body.organizador;
      expect(despues.cantidadResenias).toBe(antes.cantidadResenias + 1);
      expect(despues.puntaje).toBeLessThan(antes.puntaje);
    });

    it("solo se puede reseñar una vez", async () => {
      const res = await como(SOFIA).post("/api/compras/c-10/resenia", { puntuacion: 4 });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("YA_RESENIADA");
    });

    it("solo con la entrada utilizada", async () => {
      const res = await como(SOFIA).post("/api/compras/c-01/resenia", { puntuacion: 5 });

      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe("TRANSICION_INVALIDA");
    });

    it("valida la puntuación", async () => {
      expect((await como(TOMAS).post("/api/compras/c-12/resenia", { puntuacion: 6 })).status).toBe(400);
    });
  });

  describe("Usuario y favoritos", () => {
    it("GET /api/usuarios/me devuelve el usuario autenticado", async () => {
      const res = await como(SOFIA).get("/api/usuarios/me");

      expect(res.body).toEqual({
        id: SOFIA,
        nombre: "Sofía",
        apellido: "Ramírez",
        email: "sofia@aiticketit.com",
        tieneContrasenia: true,
      });
    });

    it("agrega y quita favoritos", async () => {
      const inicial = await como(SOFIA).get("/api/usuarios/me/favoritos");
      expect(inicial.body.map((e) => e.id).sort()).toEqual(["e-festival", "e-hamlet"]);

      expect((await como(SOFIA).put("/api/usuarios/me/favoritos/e-jazz-club")).status).toBe(204);
      expect((await como(SOFIA).put("/api/usuarios/me/favoritos/e-jazz-club")).status).toBe(204);
      expect((await como(SOFIA).delete("/api/usuarios/me/favoritos/e-hamlet")).status).toBe(204);

      const final = await como(SOFIA).get("/api/usuarios/me/favoritos");
      expect(final.body.map((e) => e.id).sort()).toEqual(["e-festival", "e-jazz-club"]);
    });

    it("no se puede agregar a favoritos un evento inexistente", async () => {
      expect((await como(SOFIA).put("/api/usuarios/me/favoritos/no-existe")).status).toBe(404);
    });
  });
});
