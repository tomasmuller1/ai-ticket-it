import { Estado, EstadoCompra } from "./EstadoCompra.js";
import { Cancelada } from "./Cancelada.js";

// La entrada ya se usó: el comprador no puede cancelarla (CU8) y habilita la reseña (CU9).
export class Utilizada extends Estado {
  static ACCIONES = ["reseniar"];

  get nombre() {
    return EstadoCompra.UTILIZADA;
  }

  // Si el organizador cancela el evento, no se va a hacer: se cancela igual y queda pendiente de reembolso.
  cancelarPorEvento(compra, quien, reloj) {
    compra.liberarCupo();
    compra.actualizarEstado(new Cancelada(), quien, reloj);
  }
}
