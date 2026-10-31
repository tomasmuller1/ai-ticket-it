import { Estado, EstadoCompra } from "./EstadoCompra.js";
import { Cancelada } from "./Cancelada.js";
import { Utilizada } from "./Utilizada.js";

export class Confirmada extends Estado {
  static ACCIONES = ["cancelar", "marcarUtilizada"];

  get nombre() {
    return EstadoCompra.CONFIRMADA;
  }

  // Queda CANCELADA y pendiente de reembolso: el service le pide la devolución a la pasarela.
  cancelar(compra, quien, reloj) {
    compra.liberarCupo();
    compra.actualizarEstado(new Cancelada(), quien, reloj);
  }

  marcarUtilizada(compra, quien, reloj) {
    compra.actualizarEstado(new Utilizada(), quien, reloj);
  }
}
