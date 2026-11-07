import { EstadoOperacionPago, OperacionPago } from "../../../src/domain/OperacionPago.js";
import { unaCompra, unReloj, unUsuario } from "../../helpers/fabricas.js";
import { EstadoCompra } from "../../../src/domain/estados/EstadoCompra.js";
import { PagoEnProcesoError } from "../../../src/errors/index.js";

const comprador = unUsuario();
const reloj = unReloj();

function iniciar(compra = unaCompra()) {
  return { compra, operacion: compra.iniciarPago({ id: "op-1", tarjetaId: "t-1" }, comprador, reloj) };
}

describe("OperacionPago", () => {
  it("nace PENDIENTE y la compra sigue PENDIENTE: el estado en proceso vive en la operación", () => {
    const { compra, operacion } = iniciar();

    expect(operacion).toBeInstanceOf(OperacionPago);
    expect(operacion.estado).toBe(EstadoOperacionPago.PENDIENTE);
    expect(compra.estado).toBe(EstadoCompra.PENDIENTE);
    expect(compra.operacionPago).toBe(operacion);
  });

  it("al confirmar el cobro, la operación queda APROBADA y la compra CONFIRMADA", () => {
    const { compra, operacion } = iniciar();

    compra.confirmarPago("tx-1", reloj);

    expect(operacion.estado).toBe(EstadoOperacionPago.APROBADA);
    expect(operacion.fechaResolucion).toEqual(reloj.ahora());
    expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
    expect(compra.transaccionPago).toBe("tx-1");
  });

  it("confirma aunque el evento haya empezado mientras se procesaba: ya se cobró", () => {
    const { compra } = iniciar();

    compra.confirmarPago("tx-1", unReloj("2026-12-11T00:00:00-03:00"));

    expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
  });

  it("al rechazarse guarda el motivo y la compra sigue PENDIENTE", () => {
    const { compra, operacion } = iniciar();

    compra.rechazarPago({ codigo: "PAGO_RECHAZADO", mensaje: "Rechazada" }, reloj);

    expect(operacion.estado).toBe(EstadoOperacionPago.RECHAZADA);
    expect(operacion.motivo).toEqual({ codigo: "PAGO_RECHAZADO", mensaje: "Rechazada" });
    expect(compra.estado).toBe(EstadoCompra.PENDIENTE);
  });

  it("con un pago en proceso no se puede iniciar otro ni cancelar", () => {
    const { compra } = iniciar();

    expect(() => compra.iniciarPago({ id: "op-2", tarjetaId: "t-1" }, comprador, reloj)).toThrow(
      PagoEnProcesoError,
    );
    expect(() => compra.cancelar(comprador, reloj)).toThrow(PagoEnProcesoError);
    expect(compra.accionesPermitidas(comprador, reloj)).toMatchObject({ pagar: false, cancelar: false });
  });

  it("después de un rechazo se puede volver a intentar", () => {
    const { compra } = iniciar();
    compra.rechazarPago({ codigo: "PAGO_RECHAZADO", mensaje: "Rechazada" }, reloj);

    const nueva = compra.iniciarPago({ id: "op-2", tarjetaId: "t-2" }, comprador, reloj);

    expect(nueva.estado).toBe(EstadoOperacionPago.PENDIENTE);
    expect(compra.accionesPermitidas(comprador, reloj).pagar).toBe(false);
  });
});
