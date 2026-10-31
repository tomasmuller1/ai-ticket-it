import { Estado, EstadoCompra } from "./EstadoCompra.js";

// La entrada ya se usó: no se puede cancelar (CU8) y habilita la reseña (CU9).
export class Utilizada extends Estado {
  static ACCIONES = ["reseniar"];

  get nombre() {
    return EstadoCompra.UTILIZADA;
  }
}
