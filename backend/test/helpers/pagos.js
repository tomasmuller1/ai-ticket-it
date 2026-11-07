import { PasarelaPagosFake } from "../../src/infra/PasarelaPagosFake.js";

// Pasarela que no resuelve ningún cobro hasta que el test llama a `liberar()`: permite mirar qué pasa
// mientras el pago está en proceso, sin depender de demoras reales.
export function pasarelaEnEspera() {
  const { promise, resolve } = Promise.withResolvers();
  const pasarela = new PasarelaPagosFake({ esperar: () => promise });
  return Object.assign(pasarela, { liberar: resolve });
}

// Espera a que el procesamiento en segundo plano termine. Reintenta con setImmediate: no hay demoras fijas.
export async function hastaQue(condicion, intentos = 200) {
  for (let i = 0; i < intentos; i++) {
    const resultado = await condicion();
    if (resultado) return resultado;
    await new Promise((resolver) => setImmediate(resolver));
  }
  throw new Error("La condición no se cumplió");
}
