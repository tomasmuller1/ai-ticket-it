import { describe, expect, it } from "vitest";

import { Compra } from "../../../src/domain/Compra.js";
import { EstadoCompra } from "../../../src/domain/estados/EstadoCompra.js";
import {
  EventoFinalizadoError,
  ProhibidoError,
  ReglaNegocioError,
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

    it("validar la entrada pasa de CONFIRMADA a UTILIZADA", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      compra.marcarUtilizada(organizador, reloj);

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
      [EstadoCompra.PENDIENTE, ["marcarUtilizada", organizador], ["reembolsar"]],
      [EstadoCompra.CONFIRMADA, ["pagar", comprador], ["reembolsar"]],
      [
        EstadoCompra.UTILIZADA,
        ["pagar", comprador],
        ["cancelar", comprador],
        ["marcarUtilizada", organizador],
      ],
      [
        EstadoCompra.CANCELADA,
        ["pagar", comprador],
        ["cancelar", comprador],
        ["marcarUtilizada", organizador],
      ],
      [EstadoCompra.REEMBOLSADA, ["pagar", comprador], ["cancelar", comprador], ["reembolsar"]],
    ])("desde %s rechaza las transiciones inválidas", (estado, ...acciones) => {
      for (const [accion, quien] of acciones) {
        const compra = compraEn(estado);
        const args = accion === "reembolsar" ? [reloj] : [quien, reloj];

        expect(() => compra[accion](...args), `${estado} → ${accion}`).toThrow(TransicionInvalidaError);
        expect(compra.estado).toBe(estado);
      }
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

  describe("diasRestantes (CU1)", () => {
    it("cuenta los días que faltan para el evento si está CONFIRMADA", () => {
      const compra = compraEn(EstadoCompra.CONFIRMADA);

      expect(compra.diasRestantes(unReloj("2026-12-08T22:00:00-03:00"))).toBe(2);
      expect(compra.diasRestantes(unReloj("2026-12-10T20:00:00-03:00"))).toBe(1);
    });

    it("es 0 si el evento ya empezó y null si no está CONFIRMADA", () => {
      expect(compraEn(EstadoCompra.CONFIRMADA).diasRestantes(unReloj("2026-12-12T00:00:00-03:00"))).toBe(0);
      expect(compraEn(EstadoCompra.PENDIENTE).diasRestantes(reloj)).toBeNull();
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

  describe("accionesPermitidas", () => {
    it("le dice a cada usuario qué puede hacer según el estado", () => {
      expect(compraEn(EstadoCompra.PENDIENTE).accionesPermitidas(comprador, reloj)).toEqual({
        pagar: true,
        cancelar: true,
        validar: false,
        reseniar: false,
        chatear: true,
      });
      expect(compraEn(EstadoCompra.CONFIRMADA).accionesPermitidas(organizador, reloj)).toEqual({
        pagar: false,
        cancelar: false,
        validar: true,
        reseniar: false,
        chatear: true,
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
  });
});
