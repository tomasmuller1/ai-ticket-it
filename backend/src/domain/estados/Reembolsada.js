import { Estado, EstadoCompra } from "./EstadoCompra.js";

// Estado final: el dinero ya se devolvió.
export class Reembolsada extends Estado {
  get nombre() {
    return EstadoCompra.REEMBOLSADA;
  }
}
