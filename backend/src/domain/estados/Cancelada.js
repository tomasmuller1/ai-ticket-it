import { Estado, EstadoCompra } from "./EstadoCompra.js";
import { Reembolsada } from "./Reembolsada.js";

export class Cancelada extends Estado {
  static ACCIONES = ["reembolsar"];

  get nombre() {
    return EstadoCompra.CANCELADA;
  }

  // Solo hay algo que reembolsar si la compra se había pagado.
  reembolsar(compra, reloj) {
    if (!compra.fuePagada) {
      this.rechazar("reembolsar");
    }
    compra.actualizarEstado(new Reembolsada(), null, reloj);
  }
}
