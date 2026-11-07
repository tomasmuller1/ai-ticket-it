import { Notificacion, TipoNotificacion } from "../../../src/domain/Notificacion.js";
import { unEvento, unOrganizador, unReloj, unUsuario, unaCompra } from "../../helpers/fabricas.js";

const UN_MINUTO_MS = 60 * 1000;

function unaNotificacion(datos = {}) {
  const evento = unEvento();
  return new Notificacion({
    id: "n-1",
    destinatario: unOrganizador(),
    tipo: TipoNotificacion.MENSAJE_NUEVO,
    titulo: "Ana te escribió por Recital",
    cuerpo: "Hola",
    evento,
    compra: unaCompra({ evento }),
    fechaHora: unReloj().ahora(),
    ...datos,
  });
}

describe("Notificacion", () => {
  it("nace sin leer y con un solo aviso", () => {
    const notificacion = unaNotificacion();

    expect(notificacion.leida).toBe(false);
    expect(notificacion.cantidad).toBe(1);
  });

  it("marcarLeida la deja leída", () => {
    const notificacion = unaNotificacion();

    notificacion.marcarLeida();

    expect(notificacion.leida).toBe(true);
  });

  it("sumarMensaje suma uno, reemplaza los textos y actualiza la fecha", () => {
    const notificacion = unaNotificacion();
    const reloj = unReloj();
    reloj.fecha = new Date(reloj.fecha.getTime() + UN_MINUTO_MS);

    notificacion.sumarMensaje(
      { titulo: "Ana te escribió 2 mensajes por Recital", cuerpo: "¿Hay baño?" },
      reloj,
    );

    expect(notificacion.cantidad).toBe(2);
    expect(notificacion.titulo).toBe("Ana te escribió 2 mensajes por Recital");
    expect(notificacion.cuerpo).toBe("¿Hay baño?");
    expect(notificacion.fechaHora).toEqual(reloj.ahora());
  });

  it("esDe compara por usuario", () => {
    const notificacion = unaNotificacion();

    expect(notificacion.esDe(unOrganizador())).toBe(true);
    expect(notificacion.esDe(unUsuario())).toBe(false);
  });

  it("los tipos de notificación no se pueden modificar", () => {
    expect(Object.isFrozen(TipoNotificacion)).toBe(true);
    expect(Object.keys(TipoNotificacion)).toEqual([
      "PAGO_CONFIRMADO",
      "PAGO_RECHAZADO",
      "RESERVA_VENCIDA",
      "REEMBOLSO_REALIZADO",
      "ENTRADA_UTILIZADA",
      "MENSAJE_NUEVO",
      "ENTRADAS_AGOTADAS",
      "EVENTO_AGOTADO",
      "EVENTO_POSPUESTO",
      "EVENTO_CANCELADO",
    ]);
  });
});
