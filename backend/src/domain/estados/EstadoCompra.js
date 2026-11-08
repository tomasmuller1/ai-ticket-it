import { TransicionInvalidaError } from "../../errors/index.js";

export const EstadoCompra = Object.freeze({
  PENDIENTE: "PENDIENTE",
  CONFIRMADA: "CONFIRMADA",
  UTILIZADA: "UTILIZADA",
  CANCELADA: "CANCELADA",
  REEMBOLSADA: "REEMBOLSADA",
});

// Patrón State: cada estado concreto redefine solo las acciones que permite y declara cuáles son.
// Por defecto, cualquier acción es una transición inválida.
export class Estado {
  static ACCIONES = [];

  get nombre() {
    throw new Error("Cada estado define su nombre");
  }

  permite(accion) {
    return this.constructor.ACCIONES.includes(accion);
  }

  pagar() {
    this.rechazar("pagar");
  }

  cancelar() {
    this.rechazar("cancelar");
  }

  // El organizador canceló el evento: por defecto, igual que cancelar (PENDIENTE y CONFIRMADA la permiten;
  // CANCELADA y REEMBOLSADA la rechazan). Utilizada la redefine.
  cancelarPorEvento(compra, quien, reloj) {
    this.cancelar(compra, quien, reloj);
  }

  marcarUtilizada() {
    this.rechazar("validar");
  }

  reembolsar() {
    this.rechazar("reembolsar");
  }

  rechazar(accion) {
    throw new TransicionInvalidaError(`No se puede ${accion} una compra ${this.nombre}`);
  }
}
