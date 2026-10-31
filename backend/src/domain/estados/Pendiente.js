import { Estado, EstadoCompra } from "./EstadoCompra.js";
import { Confirmada } from "./Confirmada.js";
import { Cancelada } from "./Cancelada.js";

// Compra creada y con el cupo reservado, esperando el pago.
export class Pendiente extends Estado {
  static ACCIONES = ["pagar", "cancelar"];

  get nombre() {
    return EstadoCompra.PENDIENTE;
  }

  pagar(compra, quien, reloj) {
    compra.actualizarEstado(new Confirmada(), quien, reloj);
  }

  cancelar(compra, quien, reloj) {
    compra.liberarCupo();
    compra.actualizarEstado(new Cancelada(), quien, reloj);
  }
}
