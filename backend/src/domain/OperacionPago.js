export const EstadoOperacionPago = Object.freeze({
  PENDIENTE: "PENDIENTE",
  APROBADA: "APROBADA",
  RECHAZADA: "RECHAZADA",
});

// Un intento de cobro en la pasarela, que tarda y se resuelve después de responderle al cliente. El estado
// "en proceso" vive acá: la compra mantiene los estados del diagrama y sigue PENDIENTE hasta que se apruebe.
export class OperacionPago {
  constructor({ id, compraId, tarjetaId, fechaCreacion }) {
    this.id = id;
    this.compraId = compraId;
    this.tarjetaId = tarjetaId;
    this.fechaCreacion = fechaCreacion;
    this.estado = EstadoOperacionPago.PENDIENTE;
    this.motivo = null;
    this.fechaResolucion = null;
  }

  get pendiente() {
    return this.estado === EstadoOperacionPago.PENDIENTE;
  }

  aprobar(reloj) {
    this.estado = EstadoOperacionPago.APROBADA;
    this.fechaResolucion = reloj.ahora();
  }

  rechazar(motivo, reloj) {
    this.estado = EstadoOperacionPago.RECHAZADA;
    this.motivo = motivo;
    this.fechaResolucion = reloj.ahora();
  }
}
