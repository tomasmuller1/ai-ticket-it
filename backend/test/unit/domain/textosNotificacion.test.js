import {
  textoEventoCancelado,
  textoEventoPospuesto,
  textoMensajeNuevo,
  textoPagoRechazado,
} from "../../../src/domain/textosNotificacion.js";
import {
  unaCompra,
  unEvento,
  unOrganizador,
  unReloj,
  unTipoEntrada,
  unUsuario,
} from "../../helpers/fabricas.js";

describe("Textos de las notificaciones", () => {
  const reloj = unReloj();
  const comprador = unUsuario({ nombre: "Sofía" });
  const evento = unEvento({ nombre: "Recital", organizador: unOrganizador() });
  const escribir = (texto) => {
    const compra = unaCompra({ evento, comprador });
    return { compra, mensaje: compra.enviarMensaje(texto, comprador, reloj) };
  };

  describe("mensaje nuevo", () => {
    it("el título dice quién escribió y, si son varios, cuántos", () => {
      const { compra, mensaje } = escribir("Hola");

      expect(textoMensajeNuevo(compra, mensaje).titulo).toBe("Sofía te escribió por Recital");
      expect(textoMensajeNuevo(compra, mensaje, 3).titulo).toBe("Sofía te escribió 3 mensajes por Recital");
    });

    it.each([
      ["una bandera", "🇦🇷"],
      ["un emoji con tono de piel", "👍🏽"],
      ["una familia", "👨‍👩‍👧"],
      ["una letra con tilde combinada", "é"],
    ])("no parte %s que queda justo en el borde del corte", (_, grafema) => {
      const { compra, mensaje } = escribir(`${"a".repeat(118)}${grafema}${"b".repeat(10)}`);

      const { cuerpo } = textoMensajeNuevo(compra, mensaje);

      expect(cuerpo).toBe(`${"a".repeat(118)}${grafema}…`);
    });

    it("recorta a 120 grafemas contando el '…'", () => {
      const { compra, mensaje } = escribir("🇦🇷".repeat(130));

      const { cuerpo } = textoMensajeNuevo(compra, mensaje);

      const grafemas = [...new Intl.Segmenter("es", { granularity: "grapheme" }).segment(cuerpo)];
      expect(grafemas).toHaveLength(120);
      expect(cuerpo).toBe(`${"🇦🇷".repeat(119)}…`);
    });

    it("junta los saltos de línea y los espacios repetidos en uno solo", () => {
      const { compra, mensaje } = escribir("Hola\n\n¿Hay   estacionamiento?\n\tGracias");

      expect(textoMensajeNuevo(compra, mensaje).cuerpo).toBe("Hola ¿Hay estacionamiento? Gracias");
    });
  });

  describe("pago rechazado", () => {
    const rechazada = (motivo) => {
      const compra = unaCompra({ evento, comprador });
      compra.iniciarPago({ id: "op-1", tarjetaId: "t-1" }, comprador, reloj);
      compra.rechazarPago(motivo, reloj);
      return compra;
    };

    it("si la tarjeta se rechazó, dice que se rechazó el pago", () => {
      const compra = rechazada({ codigo: "PAGO_RECHAZADO", mensaje: "Rechazada" });

      expect(textoPagoRechazado(compra)).toEqual({
        titulo: "No pudimos cobrar tu compra",
        cuerpo: "Se rechazó el pago de tus entradas para Recital. Podés reintentarlo desde la compra.",
      });
    });

    it("si la pasarela no respondió, dice que no pudimos comunicarnos con el medio de pago", () => {
      const compra = rechazada({ codigo: "PASARELA_NO_DISPONIBLE", mensaje: "No responde" });

      expect(textoPagoRechazado(compra)).toEqual({
        titulo: "No pudimos cobrar tu compra",
        cuerpo:
          "No pudimos comunicarnos con el medio de pago para tus entradas de Recital. Es algo temporal: reintentalo desde la compra en unos minutos.",
      });
    });
  });

  describe("evento pospuesto", () => {
    const fechaAnterior = new Date("2026-12-10T21:00:00-03:00");
    const deUnEventoPospuesto = ({ pagada = false, pagoEnProceso = false, precio = 1000 } = {}) => {
      const pospuesto = unEvento({
        nombre: "Recital",
        organizador: unOrganizador(),
        fecha: fechaAnterior,
        tiposEntrada: [unTipoEntrada({ precio })],
      });
      const compra = unaCompra({ evento: pospuesto, comprador });
      if (pagada) compra.pagar(comprador, reloj);
      if (pagoEnProceso) compra.iniciarPago({ id: "op-1", tarjetaId: "t-1" }, comprador, reloj);
      pospuesto.posponer(new Date("2026-12-17T21:00:00-03:00"), reloj);
      return compra;
    };

    it("con la entrada pagada, dice las dos fechas y que la entrada sigue valiendo", () => {
      const compra = deUnEventoPospuesto({ pagada: true });

      expect(textoEventoPospuesto(compra, { fechaAnterior })).toEqual({
        titulo: "Recital se pospuso",
        cuerpo:
          "La nueva fecha es Jue 17 dic, 21:00 (era Jue 10 dic, 21:00). Tu entrada sigue valiendo; si no podés ir, cancelá la compra y te devolvemos el dinero.",
      });
    });

    // Con una entrada gratis no hay dinero que devolver (Compra#requiereReembolso).
    it("con la entrada gratis, dice que sigue valiendo sin prometer devolver dinero", () => {
      const compra = deUnEventoPospuesto({ pagada: true, precio: 0 });

      expect(textoEventoPospuesto(compra, { fechaAnterior }).cuerpo).toBe(
        "La nueva fecha es Jue 17 dic, 21:00 (era Jue 10 dic, 21:00). Tu entrada sigue valiendo; si no podés ir, cancelá la compra.",
      );
    });

    it("con la reserva sin pagar, le pide completar el pago antes de que venza", () => {
      const compra = deUnEventoPospuesto();

      expect(textoEventoPospuesto(compra, { fechaAnterior }).cuerpo).toBe(
        "La nueva fecha es Jue 17 dic, 21:00 (era Jue 10 dic, 21:00). Si todavía querés ir, completá el pago antes de que venza tu reserva.",
      );
    });

    it("con el pago en proceso, le dice que si se acredita la entrada vale para la nueva fecha", () => {
      const compra = deUnEventoPospuesto({ pagoEnProceso: true });

      expect(textoEventoPospuesto(compra, { fechaAnterior }).cuerpo).toBe(
        "La nueva fecha es Jue 17 dic, 21:00 (era Jue 10 dic, 21:00). Tu pago está en proceso: si se acredita, tu entrada vale para la nueva fecha.",
      );
    });

    it("con motivo, lo suma al final en una sola línea", () => {
      const compra = deUnEventoPospuesto();

      const { cuerpo } = textoEventoPospuesto(compra, {
        fechaAnterior,
        motivo: "El estadio\n\n  no está libre.",
      });

      expect(cuerpo).toBe(
        "La nueva fecha es Jue 17 dic, 21:00 (era Jue 10 dic, 21:00). Si todavía querés ir, completá el pago antes de que venza tu reserva. Motivo: El estadio no está libre.",
      );
    });
  });

  describe("evento cancelado", () => {
    const deUnEventoCancelado = (preparar = () => {}, { precio = 1000 } = {}) => {
      const compra = unaCompra({
        evento: unEvento({
          nombre: "Recital",
          organizador: unOrganizador(),
          tiposEntrada: [unTipoEntrada({ precio })],
        }),
        comprador,
      });
      preparar(compra);
      compra.evento.cancelar(reloj);
      return compra;
    };

    it("si pagó, dice cuánto le devolvemos", () => {
      const compra = deUnEventoCancelado((c) => c.pagar(comprador, reloj));

      expect(textoEventoCancelado(compra, {})).toEqual({
        titulo: "Se canceló Recital",
        cuerpo: "Te devolvemos $ 2.000 a tu tarjeta.",
      });
    });

    it("con el pago en proceso, dice que se lo devolvemos si se llega a acreditar", () => {
      const compra = deUnEventoCancelado((c) =>
        c.iniciarPago({ id: "op-1", tarjetaId: "t-1" }, comprador, reloj),
      );

      expect(textoEventoCancelado(compra, { motivo: "Problemas con el estadio." }).cuerpo).toBe(
        "Tu pago estaba en proceso: si se llega a acreditar, te devolvemos $ 2.000 a tu tarjeta. Motivo: Problemas con el estadio.",
      );
    });

    it("si no pagó, dice que no se le cobró nada", () => {
      const compra = deUnEventoCancelado();

      expect(textoEventoCancelado(compra, {}).cuerpo).toBe(
        "Tu reserva quedó sin efecto y no se te cobró nada.",
      );
    });

    // Una entrada gratis también pasa por CONFIRMADA, pero no hay nada que devolver.
    it.each([
      ["confirmada", (c) => c.pagar(comprador, reloj)],
      ["con el pago en proceso", (c) => c.iniciarPago({ id: "op-1", tarjetaId: "t-1" }, comprador, reloj)],
    ])("si era gratis, %s, dice que no se le cobró nada", (_, preparar) => {
      const compra = deUnEventoCancelado(preparar, { precio: 0 });

      expect(textoEventoCancelado(compra, {}).cuerpo).toBe(
        "Tu reserva quedó sin efecto y no se te cobró nada.",
      );
    });

    it("con motivo, lo suma al final", () => {
      const compra = deUnEventoCancelado();

      expect(textoEventoCancelado(compra, { motivo: "Problemas con el estadio." }).cuerpo).toBe(
        "Tu reserva quedó sin efecto y no se te cobró nada. Motivo: Problemas con el estadio.",
      );
    });
  });
});
