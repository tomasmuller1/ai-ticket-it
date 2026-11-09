import request from "supertest";

import { ServicioTokens } from "../../src/auth/ServicioTokens.js";
import { PasarelaPagosFake, TARJETA_RECHAZADA } from "../../src/infra/PasarelaPagosFake.js";
import { comoUsuario, configDePrueba, crearAppDePrueba } from "../helpers/app.js";
import { HOY, unReloj } from "../helpers/fabricas.js";
import { hastaQue, pasarelaEnEspera } from "../helpers/pagos.js";

// Usuarios del seed: Sofía y Valentina compran; Lucía y Martín organizan; Tomás hace las dos cosas.
// Notificaciones del seed: Sofía tiene n-01 (reembolso de c-06, leída), n-02 (pago de c-08) y n-03 (mensaje
// de Lucía en c-01) sin leer; Lucía tiene n-04 (mensaje de Valentina en c-03) sin leer.
const SOFIA = "u-sofia";
const VALENTINA = "u-valentina";
const TOMAS = "u-tomas";
const LUCIA = "u-lucia";
const MARTIN = "u-martin";
const TARJETA_SOFIA = "t-sofia-visa";
const UN_MINUTO_MS = 60 * 1000;

describe("Notificaciones", () => {
  let app;
  let reloj;

  function usar({ pasarelaPagos = new PasarelaPagosFake(), ...otras } = {}) {
    reloj = unReloj();
    app = crearAppDePrueba({ pasarelaPagos, reloj, ...otras });
  }

  beforeEach(() => usar());

  const como = (usuario, autorizacion = comoUsuario(usuario)) => ({
    get: (url) => request(app).get(url).set(autorizacion),
    post: (url, body) => request(app).post(url).set(autorizacion).send(body),
  });
  const avanzar = (ms) => {
    reloj.fecha = new Date(reloj.fecha.getTime() + ms);
  };
  const notificacionesDe = async (usuario, query = "") => {
    const res = await como(usuario).get(`/api/notificaciones?pageSize=50${query}`);
    return res.body.data;
  };
  const deCompra = async (usuario, compraId) =>
    (await notificacionesDe(usuario)).filter((n) => n.compraId === compraId);
  const noLeidas = async (usuario) => (await como(usuario).get("/api/notificaciones/resumen")).body.noLeidas;
  const hastaQueLlegue = (usuario, compraId) =>
    hastaQue(async () => {
      const avisos = await deCompra(usuario, compraId);
      return avisos.length > 0 ? avisos : null;
    });

  describe("avisos al comprador", () => {
    it("al aprobarse el pago, el comprador recibe 'Pago aprobado'", async () => {
      const pasarela = pasarelaEnEspera();
      usar({ pasarelaPagos: pasarela });
      await como(SOFIA).post("/api/compras/c-04/pago", { tarjetaId: TARJETA_SOFIA });
      const mientrasCobra = await deCompra(SOFIA, "c-04");

      pasarela.liberar();
      const avisos = await hastaQueLlegue(SOFIA, "c-04");

      expect(mientrasCobra).toEqual([]);
      expect(avisos).toEqual([
        {
          id: expect.any(String),
          tipo: "PAGO_CONFIRMADO",
          titulo: "Pago aprobado",
          cuerpo: "Ya tenés 2 entradas Mesa preferencial para Jazz en el Club.",
          fechaHora: new Date(HOY).toISOString(),
          leida: false,
          evento: { id: "e-jazz-club", nombre: "Jazz en el Club" },
          compraId: "c-04",
        },
      ]);
    });

    it("si se rechaza, recibe 'No pudimos cobrar tu compra'", async () => {
      const tarjeta = await como(SOFIA).post("/api/usuarios/me/tarjetas", {
        numero: TARJETA_RECHAZADA,
        vencimiento: "12/30",
        cvv: "123",
        titular: "Sofía Ramírez",
      });

      await como(SOFIA).post("/api/compras/c-04/pago", { tarjetaId: tarjeta.body.id });
      const avisos = await hastaQueLlegue(SOFIA, "c-04");

      expect(avisos).toEqual([
        expect.objectContaining({
          tipo: "PAGO_RECHAZADO",
          titulo: "No pudimos cobrar tu compra",
          cuerpo:
            "Se rechazó el pago de tus entradas para Jazz en el Club. Podés reintentarlo desde la compra.",
        }),
      ]);
    });

    it("si la pasarela no responde, el aviso no dice que se rechazó el pago", async () => {
      const pasarela = new PasarelaPagosFake();
      usar({ pasarelaPagos: pasarela });
      pasarela.cambiarDisponibilidad(false);

      await como(SOFIA).post("/api/compras/c-04/pago", { tarjetaId: TARJETA_SOFIA });
      const avisos = await hastaQueLlegue(SOFIA, "c-04");

      expect(avisos).toEqual([
        expect.objectContaining({
          tipo: "PAGO_RECHAZADO",
          titulo: "No pudimos cobrar tu compra",
          cuerpo:
            "No pudimos comunicarnos con el medio de pago para tus entradas de Jazz en el Club. Podés reintentarlo desde la compra.",
        }),
      ]);
      expect(avisos[0].cuerpo).not.toMatch(/rechaz/i);
    });

    describe("con el reloj avanzando", () => {
      // Tokens de 60 minutos: el avance del reloj no desloguea a nadie.
      const config = configDePrueba({ ACCESS_TOKEN_MINUTOS: "60" });
      const sesionLarga = (id) => {
        const { token } = new ServicioTokens(config.auth, unReloj()).emitirAccessToken({ id });
        return { Authorization: `Bearer ${token}` };
      };
      const comoLargo = (usuario) => como(usuario, sesionLarga(usuario));
      const reservar = (usuario, tipoEntradaId, cantidad) =>
        comoLargo(usuario).post("/api/compras", { eventoId: "e-rock-nacional", tipoEntradaId, cantidad });
      const avisosDe = async (usuario) =>
        (await comoLargo(usuario).get("/api/notificaciones?pageSize=50")).body.data;

      beforeEach(() => usar({ config }));

      it("al vencer la reserva, el comprador recibe 'Venció tu reserva'", async () => {
        const { body: reserva } = await reservar(SOFIA, "e-rock-nacional-campo", 2);
        avanzar(16 * UN_MINUTO_MS);

        await app.locals.vencerReservas();

        expect((await avisosDe(SOFIA)).filter((n) => n.compraId === reserva.id)).toEqual([
          expect.objectContaining({
            tipo: "RESERVA_VENCIDA",
            titulo: "Venció tu reserva",
            cuerpo: "Pasó el plazo para pagar tus entradas de Noche de Rock Nacional y las liberamos.",
          }),
        ]);
      });

      it("el último cupo de un tipo se reserva, vence y se vuelve a reservar: el organizador recibe un solo aviso", async () => {
        await reservar(SOFIA, "e-rock-nacional-vip", 1);
        avanzar(16 * UN_MINUTO_MS);
        await app.locals.vencerReservas();

        const otra = await reservar(VALENTINA, "e-rock-nacional-vip", 1);

        expect(otra.status).toBe(201);
        const agotados = (await avisosDe(LUCIA)).filter((n) => n.tipo === "ENTRADAS_AGOTADAS");
        expect(agotados).toHaveLength(1);
      });
    });

    it("al cancelar una compra pagada, el comprador recibe el reembolso", async () => {
      await como(SOFIA).post("/api/compras/c-01/cancelacion");

      expect((await deCompra(SOFIA, "c-01")).filter((n) => n.tipo === "REEMBOLSO_REALIZADO")).toEqual([
        expect.objectContaining({
          titulo: "Te devolvimos el dinero",
          cuerpo: "Reintegramos $ 70.000 de tu compra para Noche de Rock Nacional.",
        }),
      ]);
    });

    it("si el reembolso falla, avisa recién cuando se reintenta y sale bien", async () => {
      const pasarela = new PasarelaPagosFake();
      usar({ pasarelaPagos: pasarela });
      const reembolsos = async () =>
        (await deCompra(SOFIA, "c-01")).filter((n) => n.tipo === "REEMBOLSO_REALIZADO");
      pasarela.cambiarDisponibilidad(false);
      const fallida = await como(SOFIA).post("/api/compras/c-01/cancelacion");
      const trasLaFalla = await reembolsos();

      pasarela.cambiarDisponibilidad(true);
      await como(SOFIA).post("/api/compras/c-01/cancelacion");

      expect(fallida.status).toBe(503);
      expect(trasLaFalla).toEqual([]);
      expect(await reembolsos()).toHaveLength(1);
    });

    it("cancelar una compra sin pagar no avisa: no se movió dinero", async () => {
      const antes = await notificacionesDe(SOFIA);

      await como(SOFIA).post("/api/compras/c-04/cancelacion");

      expect(await notificacionesDe(SOFIA)).toEqual(antes);
    });

    it("al validar la entrada, el comprador recibe '¡Que lo disfrutes!'", async () => {
      await como(MARTIN).post("/api/compras/c-05/uso");

      expect(await deCompra(VALENTINA, "c-05")).toEqual([
        expect.objectContaining({
          tipo: "ENTRADA_UTILIZADA",
          titulo: "¡Que lo disfrutes!",
          cuerpo: "Validaron tu entrada para Hamlet. Después contanos qué te pareció.",
        }),
      ]);
    });
  });

  describe("chat", () => {
    it("un mensaje del comprador le llega al organizador y abre el chat de esa compra", async () => {
      await como(SOFIA).post("/api/compras/c-04/mensajes", { mensaje: "¿Hay estacionamiento?" });

      expect(await deCompra(MARTIN, "c-04")).toEqual([
        expect.objectContaining({
          tipo: "MENSAJE_NUEVO",
          titulo: "Sofía te escribió por Jazz en el Club",
          cuerpo: "¿Hay estacionamiento?",
          compraId: "c-04",
          leida: false,
        }),
      ]);
      expect(await deCompra(SOFIA, "c-04")).toEqual([]);
    });

    it("varios mensajes sin leer llegan juntos y, después de leerlos, uno nuevo abre otra notificación", async () => {
      for (const mensaje of ["Hola", "¿Hay estacionamiento?", "¿Y guardarropas?"]) {
        await como(SOFIA).post("/api/compras/c-04/mensajes", { mensaje });
      }
      const juntos = await deCompra(MARTIN, "c-04");
      await como(MARTIN).post("/api/notificaciones/lectura", { compraId: "c-04" });

      await como(SOFIA).post("/api/compras/c-04/mensajes", { mensaje: "¡Gracias!" });

      expect(juntos).toEqual([
        expect.objectContaining({
          titulo: "Sofía te escribió 3 mensajes por Jazz en el Club",
          cuerpo: "¿Y guardarropas?",
        }),
      ]);
      expect((await deCompra(MARTIN, "c-04")).map((n) => [n.titulo, n.leida])).toEqual([
        ["Sofía te escribió por Jazz en el Club", false],
        ["Sofía te escribió 3 mensajes por Jazz en el Club", true],
      ]);
    });
  });

  describe("avisos al organizador", () => {
    it("al reservar las últimas entradas VIP, el organizador recibe un aviso", async () => {
      // VIP de e-rock-nacional: cupo 4, con 3 vendidas.
      await como(SOFIA).post("/api/compras", {
        eventoId: "e-rock-nacional",
        tipoEntradaId: "e-rock-nacional-vip",
        cantidad: 1,
      });

      expect((await notificacionesDe(LUCIA)).filter((n) => n.tipo === "ENTRADAS_AGOTADAS")).toEqual([
        expect.objectContaining({
          titulo: "Se agotaron las entradas VIP",
          cuerpo: "Ya no quedan entradas VIP para Noche de Rock Nacional.",
          evento: { id: "e-rock-nacional", nombre: "Noche de Rock Nacional" },
          compraId: null,
        }),
      ]);
    });

    it("comprar entradas no le avisa al organizador si quedan disponibles", async () => {
      const antes = await notificacionesDe(LUCIA);

      const compra = await como(SOFIA).post("/api/compras", {
        eventoId: "e-rock-nacional",
        tipoEntradaId: "e-rock-nacional-campo",
        cantidad: 2,
      });

      expect(compra.status).toBe(201);
      expect(await notificacionesDe(LUCIA)).toEqual(antes);
    });
  });

  describe("GET /api/notificaciones", () => {
    it("soloNoLeidas=true filtra y la lista viene ordenada de la más reciente a la más vieja", async () => {
      await como(SOFIA).post("/api/compras/c-01/cancelacion");
      avanzar(UN_MINUTO_MS);
      await como(TOMAS).post("/api/compras/c-08/mensajes", { mensaje: "¡Nos vemos en la conferencia!" });

      const res = await como(SOFIA).get("/api/notificaciones?soloNoLeidas=true");
      const todas = await como(SOFIA).get("/api/notificaciones");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 4 });
      expect(res.body.data.map((n) => [n.tipo, n.compraId])).toEqual([
        ["MENSAJE_NUEVO", "c-08"],
        ["REEMBOLSO_REALIZADO", "c-01"],
        ["MENSAJE_NUEVO", "c-01"],
        ["PAGO_CONFIRMADO", "c-08"],
      ]);
      expect(res.body.data.every((n) => !n.leida)).toBe(true);
      const fechas = res.body.data.map((n) => n.fechaHora);
      expect(fechas).toEqual([...fechas].sort().reverse());
      expect(todas.body.total).toBe(5);
    });

    it("pagina los resultados", async () => {
      const res = await como(SOFIA).get("/api/notificaciones?page=2&pageSize=2");

      expect(res.body).toMatchObject({ page: 2, pageSize: 2, total: 3 });
      expect(res.body.data.map((n) => n.id)).toEqual(["n-01"]);
    });

    it("valida los parámetros", async () => {
      const filtro = await como(SOFIA).get("/api/notificaciones?soloNoLeidas=quizas");
      const pagina = await como(SOFIA).get("/api/notificaciones?pageSize=0");

      expect(filtro.status).toBe(400);
      expect(filtro.body.error.detalles).toEqual([expect.objectContaining({ campo: "soloNoLeidas" })]);
      expect(pagina.status).toBe(400);
    });
  });

  describe("GET /api/notificaciones/resumen", () => {
    it("cuenta las no leídas del usuario", async () => {
      expect(await noLeidas(SOFIA)).toBe(2);
      expect(await noLeidas(LUCIA)).toBe(1);
      expect(await noLeidas(VALENTINA)).toBe(0);
    });
  });

  describe("POST /api/notificaciones/lectura", () => {
    it("las marca todas y devuelve cuántas", async () => {
      const res = await como(SOFIA).post("/api/notificaciones/lectura");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ marcadas: 2 });
      expect(await noLeidas(SOFIA)).toBe(0);
      expect(await noLeidas(LUCIA)).toBe(1);
    });

    it("con compraId marca solo esa compra", async () => {
      const res = await como(SOFIA).post("/api/notificaciones/lectura", { compraId: "c-01" });

      expect(res.body).toEqual({ marcadas: 1 });
      expect((await notificacionesDe(SOFIA, "&soloNoLeidas=true")).map((n) => n.compraId)).toEqual(["c-08"]);
    });

    it("valida el compraId", async () => {
      const res = await como(SOFIA).post("/api/notificaciones/lectura", { compraId: "" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/notificaciones/:id/lectura", () => {
    it("marca leída una notificación propia y la devuelve", async () => {
      const res = await como(SOFIA).post("/api/notificaciones/n-03/lectura");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "n-03", leida: true, compraId: "c-01" });
      expect(await noLeidas(SOFIA)).toBe(1);
    });

    it("de otra persona responde 404", async () => {
      const ajena = await como(LUCIA).post("/api/notificaciones/n-03/lectura");
      const inexistente = await como(SOFIA).post("/api/notificaciones/no-existe/lectura");

      expect(ajena.status).toBe(404);
      expect(ajena.body.error).toEqual({
        codigo: "NO_ENCONTRADO",
        mensaje: "No encontramos esa notificación",
      });
      expect(inexistente.status).toBe(404);
      expect(await noLeidas(SOFIA)).toBe(2);
    });
  });

  it("el seed trae notificaciones de ejemplo y el reset las restaura", async () => {
    const deEjemplo = await notificacionesDe(SOFIA);
    await como(SOFIA).post("/api/notificaciones/lectura");
    await como(LUCIA).post("/api/notificaciones/lectura");

    await request(app).post("/api/dev/reset");

    expect(deEjemplo.map((n) => [n.id, n.tipo, n.compraId, n.leida])).toEqual([
      ["n-03", "MENSAJE_NUEVO", "c-01", false],
      ["n-02", "PAGO_CONFIRMADO", "c-08", false],
      ["n-01", "REEMBOLSO_REALIZADO", "c-06", true],
    ]);
    expect(deEjemplo[0]).toMatchObject({
      titulo: "Lucía te escribió por Noche de Rock Nacional",
      cuerpo: "Hola Sofía, abrimos a las 19 h. ¡Te esperamos!",
    });
    expect(await noLeidas(SOFIA)).toBe(2);
    expect(await noLeidas(LUCIA)).toBe(1);
  });

  it("sin sesión responde 401", async () => {
    const respuestas = await Promise.all([
      request(app).get("/api/notificaciones"),
      request(app).get("/api/notificaciones/resumen"),
      request(app).post("/api/notificaciones/lectura"),
      request(app).post("/api/notificaciones/n-03/lectura"),
    ]);

    expect(respuestas.map((res) => res.status)).toEqual([401, 401, 401, 401]);
  });
});
