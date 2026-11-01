import { randomUUID } from "node:crypto";

import { PasarelaNoDisponibleError } from "../errors/index.js";

// Patrón Adapter: los services dependen de esta interfaz (tokenizar / cobrar / reembolsar), no de un
// proveedor. Para usar Mercado Pago u otro medio de pago se escribe otro adaptador con los mismos métodos.
// Esta implementación simula un proveedor que aprueba todo mientras está disponible; en desarrollo se
// puede "apagar" (POST /api/dev/pasarela) para mostrar cómo se degrada la app cuando el servicio cae.
export class PasarelaPagosFake {
  constructor() {
    this.operaciones = [];
    this.disponible = true;
  }

  cambiarDisponibilidad(disponible) {
    this.disponible = disponible;
  }

  // Guarda la tarjeta del lado del proveedor y devuelve un token para cobrarle. No se valida que la
  // tarjeta exista: es una pasarela simulada.
  async tokenizar({ numero }) {
    this.#verificarDisponible();
    return { token: `tok_${randomUUID()}`, marca: marcaDe(numero), ultimos4: numero.slice(-4) };
  }

  async cobrar({ referencia, monto, token }) {
    this.#verificarDisponible();
    return this.#registrar("COBRO", referencia, monto, token);
  }

  async reembolsar({ referencia, monto }) {
    this.#verificarDisponible();
    return this.#registrar("REEMBOLSO", referencia, monto);
  }

  #verificarDisponible() {
    if (!this.disponible) throw new PasarelaNoDisponibleError();
  }

  #registrar(tipo, referencia, monto, token) {
    const operacion = { id: randomUUID(), tipo, referencia, monto, ...(token && { token }) };
    this.operaciones.push(operacion);
    return { transaccionId: operacion.id };
  }
}

// Marca según los primeros dígitos (rangos públicos de cada red).
export function marcaDe(numero) {
  if (/^3[47]/.test(numero)) return "American Express";
  if (/^4/.test(numero)) return "Visa";
  const seis = Number(numero.slice(0, 6));
  if (/^5[1-5]/.test(numero) || (seis >= 222100 && seis <= 272099)) return "Mastercard";
  return "Otra";
}
