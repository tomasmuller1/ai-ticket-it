import { Compra } from "../../../src/domain/Compra.js";
import { EstadoCompra } from "../../../src/domain/estados/EstadoCompra.js";
import {
  EventoCanceladoError,
  EventoFinalizadoError,
  PagoEnProcesoError,
  ProhibidoError,
  ReglaNegocioError,
  ReservaVencidaError,
  SinCupoError,
  TransicionInvalidaError,
  ValidacionError,
} from "../../../src/errors/index.js";
import {
  unaCompra,
  unEvento,
  unOrganizador,
  unReloj,
  unTipoEntrada,
  unUsuario,
} from "../../helpers/fabricas.js";

const comprador = unUsuario();
const organizador = unOrganizador();
const otro = unUsuario({ id: "u-otro" });
const reloj = unReloj();

function compraEn(estado) {
  const compra = unaCompra();
  if (estado === EstadoCompra.PENDIENTE) return compra;
  if (estado === EstadoCompra.CANCELADA) {
    compra.cancelar(comprador, reloj);
    return compra;
  }
  compra.pagar(comprador, reloj);
  if (estado === EstadoCompra.UTILIZADA) compra.marcarUtilizada(organizador, reloj);
  if (estado === EstadoCompra.REEMBOLSADA) {
    compra.cancelar(comprador, reloj);
    compra.reembolsar(reloj);
  }
  return compra;
}

describe("Compra", () => {
  describe("crear (CU12)", () => {
    it("queda PENDIENTE, calcula el total y reserva el cupo", () => {
      const evento = unEvento({ tiposEntrada: [unTipoEntrada({ precio: 1500, cupo: 10 })] });

      const compra = unaCompra({ evento, cantidad: 3 });

      expect(compra.estado).toBe(EstadoCompra.PENDIENTE);
      expect(compra.precioUnitario).toBe(1500);
      expect(compra.total).toBe(4500);
      expect(evento.tiposEntrada[0].disponibles()).toBe(7);
    });

    it("registra el primer cambio de estado con quién y cuándo", () => {
      const compra = unaCompra();

      expect(compra.historial).toHaveLength(1);
      expect(compra.historial[0]).toMatchObject({ estado: EstadoCompra.PENDIENTE, quien: comprador });
      expect(compra.historial[0].fechaHora).toEqual(reloj.ahora());
    });

    it("congela el precio aunque después cambie el del tipo de entrada", () => {
      const evento = unEvento();
      const compra = unaCompra({ evento });

      evento.tiposEntrada[0].precio = 999999;

      expect(compra.total).toBe(2000);
    });

    it("no permite superar el cupo disponible", () => {
      const evento = unEvento({ tiposEntrada: [unTipoEntrada({ cupo: 2 })] });

      expect(() => unaCompra({ evento, cantidad: 3 })).toThrow(SinCupoError);
    });

    it("exige una cantidad entera entre 1 y 10", () => {
      expect(() => unaCompra({ cantidad: 0 })).toThrow(ValidacionError);
      expect(() => unaCompra({ cantidad: 11 })).toThrow(ValidacionError);
      expect(() => unaCompra({ cantidad: 1.5 })).toThrow(ValidacionError);
    });

    it("no permite comprar entradas de un evento que ya se realizó", () => {
      expect(() => unaCompra({ reloj: unReloj("2026-12-11T00:00:00-03:00") })).toThrow(EventoFinalizadoError);
    });

    it("no permite que el organizador compre entradas de su propio evento", () => {
      expect(() => unaCompra({ comprador: organizador })).toThrow(ReglaNegocioError);
    });

    it("el tipo de entrada tiene que pertenecer al evento", () => {
      expect(() =>
        Compra.crear({ id: "c", comprador, evento: unEvento(), tipoEntradaId: "otro", cantidad: 1, reloj }),
      ).toThrow(ValidacionError);
    });
  });

  describe("entradas gratis", () => {
    const gratis = () => unEvento({ tiposEntrada: [unTipoEntrada({ precio: 0, cupo: 10 })] });
    const venceEn = new Date("2026-11-01T12:15:00-03:00");

    it("queda CONFIRMADA al crearla, sin pasar por el pago, y reserva el cupo", () => {
      const evento = gratis();

      const compra = unaCompra({ evento, cantidad: 3, venceEn });

      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
      expect(compra.total).toBe(0);
      expect(compra.esGratuita).toBe(true);
      expect(compra.operacionPago).toBeNull();
      expect(evento.tiposEntrada[0].disponibles()).toBe(7);
    });

    it("registra un único cambio de estado, CONFIRMADA, por el comprador", () => {
      const compra = unaCompra({ evento: gratis() });

      expect(compra.historial).toHaveLength(1);
      expect(compra.historial[0]).toMatchObject({ estado: EstadoCompra.CONFIRMADA, quien: comprador });
      expect(compra.historial[0].fechaHora).toEqual(reloj.ahora());
    });

    it("no tiene plazo de reserva ni vence", () => {
      const compra = unaCompra({ evento: gratis(), venceEn });
      const muchoDespues = unReloj("2026-11-02T12:00:00-03:00");

      expect(compra.reservaVenceEn).toBeNull();
      expect(compra.plazoDePagoCumplido(muchoDespues)).toBe(false);
      expect(compra.vencer(muchoDespues)).toBe(false);
      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
    });

    it("no se puede pagar", () => {
      const compra = unaCompra({ evento: gratis() });

      expect(compra.accionesPermitidas(comprador, reloj).pagar).toBe(false);
      expect(() => compra.verificarPago(comprador, reloj)).toThrow(TransicionInvalidaError);
    });

    it("al cancelarla queda CANCELADA, libera el cupo y no hay nada que reembolsar", () => {
      const evento = gratis();
      const compra = unaCompra({ evento });

      compra.cancelar(comprador, reloj);

      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
      expect(evento.tiposEntrada[0].disponibles()).toBe(10);
      expect(compra.fuePagada).toBe(false);
      expect(compra.requiereReembolso()).toBe(false);
      expect(compra.accionesPermitidas(comprador, reloj).reintentarReembolso).toBe(false);
      expect(() => compra.reembolsar(reloj)).toThrow(TransicionInvalidaError);
    });

    it("el organizador la valida en el ingreso como cualquier otra", () => {
      const compra = unaCompra({ evento: gratis() });

      compra.marcarUtilizada(organizador, reloj);

      expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
    });

    it("una entrada paga sigue esperando el pago", () => {
      const compra = unaCompra({ venceEn });

      expect(compra.esGratuita).toBe(false);
      expect(compra.estado).toBe(EstadoCompra.PENDIENTE);
      expect(compra.reservaVenceEn).toEqual(venceEn);
    });
  });

  describe("transiciones de estado (patrón State)", () => {
    it("pagar pasa de PENDIENTE a CONFIRMADA", () => {
      const compra = compraEn(EstadoCompra.PENDIENTE);

      compra.pagar(comprador, reloj);

      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
      expect(compra.fuePagada).toBe(true);
    });

    it("cancelar una PENDIENTE la deja CANCELADA, libera el cupo y no requiere reembolso", () => {
      const compra = compraEn(EstadoCompra.PENDIENTE);

      compra.cancelar(comprador, reloj);

      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
      expect(compra.tipoEntrada.disponibles()).toBe(100);
      expect(compra.requiereReembolso()).toBe(false);
    });

    it("cancelar una CONFIRMADA requiere reembolso y reembolsar la deja REEMBOLSADA", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      compra.cancelar(comprador, reloj);
      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
      expect(compra.requiereReembolso()).toBe(true);

      compra.reembolsar(reloj);
      expect(compra.estado).toBe(EstadoCompra.REEMBOLSADA);
      expect(compra.requiereReembolso()).toBe(false);
    });

    it("cancelar una CONFIRMADA gratis no requiere reembolso: no hay dinero que devolver", () => {
      // Una entrada gratis nace CONFIRMADA: no pasa por el pago.
      const compra = unaCompra({ evento: unEvento({ tiposEntrada: [unTipoEntrada({ precio: 0 })] }) });

      compra.cancelar(comprador, reloj);

      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
      expect(compra.requiereReembolso()).toBe(false);
      expect(compra.accionesPermitidas(comprador, reloj).reintentarReembolso).toBe(false);
    });

    it("validar la entrada pasa de CONFIRMADA a UTILIZADA", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      compra.marcarUtilizada(organizador, reloj);

      expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
    });

    it("posponer devuelve una UTILIZADA a CONFIRMADA", () => {
      const compra = compraEn(EstadoCompra.UTILIZADA);
      const disponiblesAntes = compra.tipoEntrada.disponibles();
      compra.evento.posponer(new Date("2026-12-17T21:00:00-03:00"), reloj);

      compra.reabrirPorPostergacion(organizador, reloj);

      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
      expect(compra.historial.at(-1)).toMatchObject({ estado: EstadoCompra.CONFIRMADA, quien: organizador });
      expect(compra.tipoEntrada.disponibles()).toBe(disponiblesAntes);
      compra.marcarUtilizada(organizador, reloj);
      expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
    });

    it("reabrirPorPostergacion rechaza una CONFIRMADA", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      expect(() => compra.reabrirPorPostergacion(organizador, reloj)).toThrow(TransicionInvalidaError);
      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
    });

    it("solo el organizador reabre una entrada validada", () => {
      const compra = compraEn(EstadoCompra.UTILIZADA);

      expect(() => compra.reabrirPorPostergacion(comprador, reloj)).toThrow(ProhibidoError);
      expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
    });

    it("cada transición queda en el historial con quién la hizo", () => {
      const compra = compraEn(EstadoCompra.UTILIZADA);

      expect(compra.historial.map((c) => [c.estado, c.quien?.id])).toEqual([
        [EstadoCompra.PENDIENTE, comprador.id],
        [EstadoCompra.CONFIRMADA, comprador.id],
        [EstadoCompra.UTILIZADA, organizador.id],
      ]);
    });

    it.each([
      [EstadoCompra.PENDIENTE, "marcarUtilizada", organizador],
      [EstadoCompra.PENDIENTE, "reembolsar", null],
      [EstadoCompra.CONFIRMADA, "pagar", comprador],
      [EstadoCompra.CONFIRMADA, "reembolsar", null],
      [EstadoCompra.UTILIZADA, "pagar", comprador],
      [EstadoCompra.UTILIZADA, "cancelar", comprador],
      [EstadoCompra.UTILIZADA, "marcarUtilizada", organizador],
      [EstadoCompra.CANCELADA, "pagar", comprador],
      [EstadoCompra.CANCELADA, "cancelar", comprador],
      [EstadoCompra.CANCELADA, "marcarUtilizada", organizador],
      [EstadoCompra.REEMBOLSADA, "pagar", comprador],
      [EstadoCompra.REEMBOLSADA, "cancelar", comprador],
      [EstadoCompra.REEMBOLSADA, "reembolsar", null],
      [EstadoCompra.PENDIENTE, "reabrirPorPostergacion", organizador],
      [EstadoCompra.CANCELADA, "reabrirPorPostergacion", organizador],
      [EstadoCompra.REEMBOLSADA, "reabrirPorPostergacion", organizador],
    ])("desde %s rechaza la transición %s", (estado, accion, quien) => {
      const compra = compraEn(estado);
      const args = accion === "reembolsar" ? [reloj] : [quien, reloj];

      expect(() => compra[accion](...args)).toThrow(TransicionInvalidaError);
      expect(compra.estado).toBe(estado);
    });
  });

  describe("cancelar (CU7 y CU8)", () => {
    it("no se puede cancelar si el evento ya se realizó", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      expect(() => compra.cancelar(comprador, unReloj("2026-12-11T00:00:00-03:00"))).toThrow(
        EventoFinalizadoError,
      );
    });

    it("solo el comprador puede cancelar", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      expect(() => compra.cancelar(organizador, reloj)).toThrow(ProhibidoError);
    });
  });

  describe("permisos", () => {
    it("solo el comprador puede pagar", () => {
      expect(() => compraEn(EstadoCompra.PENDIENTE).pagar(otro, reloj)).toThrow(ProhibidoError);
    });

    it("solo el organizador del evento puede validar la entrada", () => {
      expect(() => compraEn(EstadoCompra.CONFIRMADA).marcarUtilizada(comprador, reloj)).toThrow(
        ProhibidoError,
      );
    });

    it("pueden verla el comprador y el organizador, nadie más", () => {
      const compra = unaCompra();

      expect(compra.puedeVer(comprador)).toBe(true);
      expect(compra.puedeVer(organizador)).toBe(true);
      expect(compra.puedeVer(otro)).toBe(false);
    });
  });

  // El evento de la fábrica es el jueves 10/12/2026 a las 21:00 (hora de Argentina).
  describe("tiempoRestante (CU1)", () => {
    it("con un día o más, cuenta días de calendario en la hora de Argentina", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      expect(compra.tiempoRestante(unReloj("2026-12-08T22:00:00-03:00")).dias).toBe(2);
      // Faltan 45 h 30 min: el evento es pasado mañana.
      expect(compra.tiempoRestante(unReloj("2026-12-08T23:30:00-03:00")).dias).toBe(2);
      // Faltan 36 h y el evento es mañana a la noche.
      expect(compra.tiempoRestante(unReloj("2026-12-09T09:00:00-03:00")).dias).toBe(1);
    });

    it("con menos de 24 h no dice que falta un día: dias es 0 y los minutos dicen cuánto falta", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      expect(compra.tiempoRestante(unReloj("2026-12-09T23:00:00-03:00"))).toEqual({
        dias: 0,
        minutos: 22 * 60,
      });
      expect(compra.tiempoRestante(unReloj("2026-12-10T20:00:00-03:00"))).toEqual({ dias: 0, minutos: 60 });
      expect(compra.tiempoRestante(unReloj("2026-12-10T20:45:00-03:00"))).toEqual({ dias: 0, minutos: 15 });
    });

    it("redondea los minutos para arriba: a 30 segundos de empezar falta 1 minuto", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      expect(compra.tiempoRestante(unReloj("2026-12-10T20:59:30-03:00"))).toEqual({ dias: 0, minutos: 1 });
    });

    it("informa los minutos también cuando falta más de un día", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      expect(compra.tiempoRestante(unReloj("2026-12-08T21:00:00-03:00"))).toEqual({
        dias: 2,
        minutos: 2 * 24 * 60,
      });
    });

    it("es 0 si el evento ya empezó y null si no está CONFIRMADA", () => {
      expect(compraEn(EstadoCompra.CONFIRMADA).tiempoRestante(unReloj("2026-12-12T00:00:00-03:00"))).toEqual({
        dias: 0,
        minutos: 0,
      });
      expect(compraEn(EstadoCompra.PENDIENTE).tiempoRestante(reloj)).toBeNull();
      expect(compraEn(EstadoCompra.UTILIZADA).tiempoRestante(reloj)).toBeNull();
    });
  });

  describe("chat (CU5 y CU6)", () => {
    it("el comprador y el organizador pueden enviar mensajes en cualquier estado", () => {
      const compra = compraEn(EstadoCompra.REEMBOLSADA);

      compra.enviarMensaje(" Hola, ¿hay estacionamiento? ", comprador, reloj);
      compra.enviarMensaje("Sí, sobre la calle lateral", organizador, reloj);

      expect(compra.mensajes.map((m) => [m.usuario.id, m.mensaje])).toEqual([
        [comprador.id, "Hola, ¿hay estacionamiento?"],
        [organizador.id, "Sí, sobre la calle lateral"],
      ]);
      expect(compra.mensajes[0].enviado).toEqual(reloj.ahora());
    });

    it("nadie más puede escribir", () => {
      expect(() => unaCompra().enviarMensaje("hola", otro, reloj)).toThrow(ProhibidoError);
    });

    it("el mensaje no puede estar vacío ni superar 1000 caracteres", () => {
      const compra = unaCompra();

      expect(() => compra.enviarMensaje("   ", comprador, reloj)).toThrow(ValidacionError);
      expect(() => compra.enviarMensaje("x".repeat(1001), comprador, reloj)).toThrow(ValidacionError);
    });
  });

  describe("reseña (CU9)", () => {
    it("el comprador puede reseñar una compra UTILIZADA una sola vez", () => {
      const compra = compraEn(EstadoCompra.UTILIZADA);

      const resenia = compra.reseniar({ id: "r-1", puntuacion: 5, detalle: "Excelente" }, comprador, reloj);

      expect(resenia).toMatchObject({
        puntuacion: 5,
        detalle: "Excelente",
        comprador,
        evento: compra.evento,
      });
      expect(compra.resenia).toBe(resenia);
      expect(() => compra.reseniar({ id: "r-2", puntuacion: 4, detalle: "" }, comprador, reloj)).toThrow(
        ReglaNegocioError,
      );
    });

    it.each([
      EstadoCompra.PENDIENTE,
      EstadoCompra.CONFIRMADA,
      EstadoCompra.CANCELADA,
      EstadoCompra.REEMBOLSADA,
    ])("no se puede reseñar una compra %s", (estado) => {
      expect(() => compraEn(estado).reseniar({ id: "r", puntuacion: 5 }, comprador, reloj)).toThrow(
        TransicionInvalidaError,
      );
    });

    it("solo el comprador puede reseñar", () => {
      expect(() =>
        compraEn(EstadoCompra.UTILIZADA).reseniar({ id: "r", puntuacion: 5 }, organizador, reloj),
      ).toThrow(ProhibidoError);
    });
  });

  describe("vencimiento de la reserva", () => {
    const en = (hora) => unReloj(`2026-11-01T${hora}-03:00`);
    const compraConPlazo = () => unaCompra({ venceEn: new Date("2026-11-01T12:15:00-03:00") });

    it("una PENDIENTE de un evento cancelado no vence: la resuelve el barrido de eventos cancelados", () => {
      const compra = compraConPlazo();
      compra.evento.cancelar(en("12:00:00"));

      expect(compra.correspondeVencer(en("12:20:00"))).toBe(false);
      expect(compra.vencer(en("12:20:00"))).toBe(false);
      expect(compra.estado).toBe(EstadoCompra.PENDIENTE);
    });

    it("no vence durante el margen posterior al plazo", () => {
      const compra = compraConPlazo();

      expect(compra.correspondeVencer(en("12:15:59"))).toBe(false);
    });

    it("vence cuando se cumple el margen posterior al plazo y libera el cupo", () => {
      const compra = compraConPlazo();
      const cupoAntes = compra.tipoEntrada.disponibles();

      const venció = compra.vencer(en("12:16:00"));

      expect(venció).toBe(true);
      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
      expect(compra.canceladaPorVencimiento).toBe(true);
      expect(compra.historial.at(-1).quien).toBeNull();
      expect(compra.tipoEntrada.disponibles()).toBe(cupoAntes + compra.cantidad);
      expect(compra.requiereReembolso()).toBe(false);
    });

    it("a la hora que se muestra se cumple el plazo de pago, pero la reserva no se cancela", () => {
      const compra = compraConPlazo();

      expect(compra.plazoDePagoCumplido(en("12:14:59"))).toBe(false);
      expect(compra.plazoDePagoCumplido(en("12:15:00"))).toBe(true);
      expect(compra.correspondeVencer(en("12:15:00"))).toBe(false);
      expect(compra.vencer(en("12:15:00"))).toBe(false);
      expect(compra.canceladaPorVencimiento).toBe(false);
      expect(compra.estado).toBe(EstadoCompra.PENDIENTE);
    });

    it("con un pago en proceso no se cumple el plazo de pago", () => {
      const compra = compraConPlazo();
      compra.iniciarPago({ id: "op-1", tarjetaId: "t-1" }, comprador, en("12:14:00"));

      expect(compra.plazoDePagoCumplido(en("12:20:00"))).toBe(false);
    });

    it("sin venceEn nunca se cumple el plazo de pago", () => {
      const compra = unaCompra();

      expect(compra.plazoDePagoCumplido(unReloj("2027-11-01T12:00:00-03:00"))).toBe(false);
      expect(compra.reservaVenceEn).toBeNull();
    });

    it("informa la hora límite solo mientras la compra está PENDIENTE", () => {
      const compra = compraConPlazo();
      const horaLimite = new Date("2026-11-01T12:15:00-03:00");

      expect(compra.reservaVenceEn).toEqual(horaLimite);
      compra.vencer(en("12:16:00"));

      expect(compra.reservaVenceEn).toBeNull();
      expect(compra.plazoDePagoCumplido(en("12:16:00"))).toBe(false);
    });

    it("una cancelación de la persona no cuenta como vencimiento", () => {
      const compra = compraConPlazo();

      compra.cancelar(comprador, en("12:14:00"));

      expect(compra.canceladaPorVencimiento).toBe(false);
    });

    it("sin venceEn no vence", () => {
      const compra = unaCompra();

      expect(compra.correspondeVencer(unReloj("2027-11-01T12:00:00-03:00"))).toBe(false);
    });

    it("no vence con un pago en proceso", () => {
      const compra = compraConPlazo();
      compra.iniciarPago({ id: "op-1", tarjetaId: "t-1" }, comprador, en("12:14:00"));

      expect(compra.correspondeVencer(en("12:20:00"))).toBe(false);
      expect(compra.vencer(en("12:20:00"))).toBe(false);
    });

    it("acepta el pago dentro del margen aunque ya pasó la hora que se muestra", () => {
      const compra = compraConPlazo();

      compra.pagar(comprador, en("12:15:30"));

      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
    });

    it("una compra confirmada no vence", () => {
      const compra = compraConPlazo();
      compra.pagar(comprador, en("12:14:00"));

      expect(compra.vencer(en("12:20:00"))).toBe(false);
      expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
    });

    it("un rechazo da 5 minutos más aunque el plazo haya pasado", () => {
      const compra = compraConPlazo();
      compra.iniciarPago({ id: "op-1", tarjetaId: "t-1" }, comprador, en("12:14:00"));

      compra.rechazarPago({ codigo: "PAGO_RECHAZADO", mensaje: "Rechazada" }, en("12:20:00"));

      expect(compra.correspondeVencer(en("12:25:59"))).toBe(false);
      expect(compra.correspondeVencer(en("12:26:00"))).toBe(true);
    });

    it("pagar una reserva vencida lanza ReservaVencidaError", () => {
      const compra = compraConPlazo();
      compra.vencer(en("12:16:00"));

      expect(() => compra.pagar(comprador, en("12:17:00"))).toThrow(ReservaVencidaError);
      expect(() => compra.pagar(comprador, en("12:17:00"))).toThrow(
        expect.objectContaining({ codigo: "RESERVA_VENCIDA" }),
      );
    });
  });

  describe("accionesPermitidas", () => {
    it("le dice a cada usuario qué puede hacer según el estado", () => {
      expect(compraEn(EstadoCompra.PENDIENTE).accionesPermitidas(comprador, reloj)).toEqual({
        pagar: true,
        cancelar: true,
        validar: false,
        reseniar: false,
        chatear: true,
        reintentarReembolso: false,
      });
      expect(compraEn(EstadoCompra.CONFIRMADA).accionesPermitidas(organizador, reloj)).toEqual({
        pagar: false,
        cancelar: false,
        validar: true,
        reseniar: false,
        chatear: true,
        reintentarReembolso: false,
      });
      expect(compraEn(EstadoCompra.UTILIZADA).accionesPermitidas(comprador, reloj)).toMatchObject({
        cancelar: false,
        reseniar: true,
      });
    });

    it("no ofrece cancelar si el evento ya se realizó", () => {
      const despues = unReloj("2026-12-11T00:00:00-03:00");

      expect(compraEn(EstadoCompra.CONFIRMADA).accionesPermitidas(comprador, despues).cancelar).toBe(false);
    });

    it("si se canceló una compra pagada y falta el reembolso, el comprador puede reintentarlo aunque el evento haya pasado", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);
      compra.cancelar(comprador, reloj);
      const despues = unReloj("2026-12-11T00:00:00-03:00");

      expect(compra.accionesPermitidas(comprador, despues)).toMatchObject({
        cancelar: false,
        reintentarReembolso: true,
      });
      expect(compra.accionesPermitidas(organizador, reloj).reintentarReembolso).toBe(false);
    });
  });

  describe("cancelación del evento", () => {
    it("vigente: PENDIENTE, CONFIRMADA o UTILIZADA", () => {
      expect(Object.values(EstadoCompra).map((estado) => [estado, compraEn(estado).vigente])).toEqual([
        [EstadoCompra.PENDIENTE, true],
        [EstadoCompra.CONFIRMADA, true],
        [EstadoCompra.UTILIZADA, true],
        [EstadoCompra.CANCELADA, false],
        [EstadoCompra.REEMBOLSADA, false],
      ]);
    });

    it("cancelarPorEvento cancela una CONFIRMADA, libera el cupo y requiere reembolso", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);
      compra.evento.cancelar(reloj);

      compra.cancelarPorEvento(organizador, reloj);

      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
      expect(compra.historial.at(-1)).toMatchObject({ estado: EstadoCompra.CANCELADA, quien: organizador });
      expect(compra.tipoEntrada.disponibles()).toBe(100);
      expect(compra.requiereReembolso()).toBe(true);
    });

    it("cancelarPorEvento cancela una PENDIENTE sin reembolso", () => {
      const compra = compraEn(EstadoCompra.PENDIENTE);
      compra.evento.cancelar(reloj);

      compra.cancelarPorEvento(organizador, reloj);

      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
      expect(compra.tipoEntrada.disponibles()).toBe(100);
      expect(compra.requiereReembolso()).toBe(false);
    });

    it("cancelarPorEvento cancela una UTILIZADA aunque CU8 no lo permita al comprador", () => {
      const compra = compraEn(EstadoCompra.UTILIZADA);
      compra.evento.cancelar(reloj);

      compra.cancelarPorEvento(null, reloj);

      expect(compra.estado).toBe(EstadoCompra.CANCELADA);
      expect(compra.historial.at(-1).quien).toBeNull();
      expect(compra.tipoEntrada.disponibles()).toBe(100);
      expect(compra.requiereReembolso()).toBe(true);
      compra.reembolsar(reloj);
      expect(compra.estado).toBe(EstadoCompra.REEMBOLSADA);
    });

    it("cancelarPorEvento rechaza una compra ya CANCELADA", () => {
      const compra = compraEn(EstadoCompra.CANCELADA);
      compra.evento.cancelar(reloj);

      expect(() => compra.cancelarPorEvento(organizador, reloj)).toThrow(TransicionInvalidaError);
      expect(() => compraEn(EstadoCompra.REEMBOLSADA).cancelarPorEvento(organizador, reloj)).toThrow(
        TransicionInvalidaError,
      );
      expect(compra.tipoEntrada.disponibles()).toBe(100);
    });

    it("con un pago en proceso, cancelarPorEvento lanza PAGO_EN_PROCESO", () => {
      const compra = compraEn(EstadoCompra.PENDIENTE);
      compra.iniciarPago({ id: "op-1", tarjetaId: "t-1" }, comprador, reloj);
      compra.evento.cancelar(reloj);

      expect(() => compra.cancelarPorEvento(organizador, reloj)).toThrow(PagoEnProcesoError);
      expect(compra.estado).toBe(EstadoCompra.PENDIENTE);
    });

    it("no se puede crear, pagar ni validar una compra de un evento cancelado", () => {
      const evento = unEvento();
      const pendiente = unaCompra({ id: "c-pendiente", evento });
      const confirmada = unaCompra({ id: "c-confirmada", evento });
      confirmada.pagar(comprador, reloj);
      evento.cancelar(reloj);

      expect(() => unaCompra({ id: "c-nueva", evento })).toThrow(EventoCanceladoError);
      expect(() => pendiente.pagar(comprador, reloj)).toThrow(EventoCanceladoError);
      expect(() => confirmada.marcarUtilizada(organizador, reloj)).toThrow(EventoCanceladoError);
      expect([pendiente.estado, confirmada.estado]).toEqual([
        EstadoCompra.PENDIENTE,
        EstadoCompra.CONFIRMADA,
      ]);
    });

    it("el comprador no la cancela: la cancelación del evento la resuelve el sistema", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);
      compra.evento.cancelar(reloj);

      expect(() => compra.cancelar(comprador, reloj)).toThrow(EventoCanceladoError);
    });

    it("en un evento cancelado las acciones solo dejan chatear", () => {
      const evento = unEvento();
      const pendiente = unaCompra({ id: "c-pendiente", evento });
      const confirmada = unaCompra({ id: "c-confirmada", evento });
      confirmada.pagar(comprador, reloj);
      const utilizada = unaCompra({ id: "c-utilizada", evento });
      utilizada.pagar(comprador, reloj);
      utilizada.marcarUtilizada(organizador, reloj);
      evento.cancelar(reloj);
      const soloChatear = {
        pagar: false,
        cancelar: false,
        validar: false,
        reseniar: false,
        chatear: true,
        reintentarReembolso: false,
      };

      expect(pendiente.accionesPermitidas(comprador, reloj)).toEqual(soloChatear);
      expect(confirmada.accionesPermitidas(comprador, reloj)).toEqual(soloChatear);
      expect(confirmada.accionesPermitidas(organizador, reloj)).toEqual(soloChatear);
      expect(utilizada.accionesPermitidas(comprador, reloj)).toEqual(soloChatear);
    });

    it("no se puede reseñar una compra de un evento cancelado", () => {
      const compra = compraEn(EstadoCompra.UTILIZADA);
      compra.evento.cancelar(reloj);

      expect(() => compra.reseniar({ id: "r-1", puntuacion: 5, detalle: "" }, comprador, reloj)).toThrow(
        EventoCanceladoError,
      );
      expect(compra.resenia).toBeNull();
    });

    it("pendienteDeCancelacionPorEvento: evento cancelado y la compra vigente o sin el reembolso hecho", () => {
      const evento = unEvento();
      const confirmada = unaCompra({ id: "c-confirmada", evento });
      confirmada.pagar(comprador, reloj);
      const antesDeCancelar = confirmada.pendienteDeCancelacionPorEvento();
      evento.cancelar(reloj);
      const vigente = confirmada.pendienteDeCancelacionPorEvento();
      confirmada.cancelarPorEvento(organizador, reloj);
      const sinReembolso = confirmada.pendienteDeCancelacionPorEvento();
      confirmada.reembolsar(reloj);
      const reembolsada = confirmada.pendienteDeCancelacionPorEvento();

      expect([antesDeCancelar, vigente, sinReembolso, reembolsada]).toEqual([false, true, true, false]);
    });
  });
});
