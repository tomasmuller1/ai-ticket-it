import { textoMensajeNuevo, textoPagoRechazado } from "../../../src/domain/textosNotificacion.js";
import { unaCompra, unEvento, unOrganizador, unReloj, unUsuario } from "../../helpers/fabricas.js";

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
          "No pudimos comunicarnos con el medio de pago para tus entradas de Recital. Podés reintentarlo desde la compra.",
      });
    });
  });
});
