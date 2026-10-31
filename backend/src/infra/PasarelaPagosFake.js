import { randomUUID } from "node:crypto";

// Patrón Adapter: los services dependen de esta interfaz (cobrar / reembolsar), no de un proveedor.
// Para usar Mercado Pago u otro medio de pago se escribe otro adaptador con los mismos métodos.
// Esta implementación simula un proveedor que siempre aprueba.
export class PasarelaPagosFake {
  constructor() {
    this.operaciones = [];
  }

  async cobrar({ referencia, monto }) {
    return this.#registrar("COBRO", referencia, monto);
  }

  async reembolsar({ referencia, monto }) {
    return this.#registrar("REEMBOLSO", referencia, monto);
  }

  #registrar(tipo, referencia, monto) {
    const operacion = { id: randomUUID(), tipo, referencia, monto };
    this.operaciones.push(operacion);
    return { transaccionId: operacion.id };
  }
}
