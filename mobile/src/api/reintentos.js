// Reglas de los reintentos automáticos de las consultas. Las mutaciones no se reintentan solas: repetir un
// POST sin una clave de idempotencia podría cobrar o reservar dos veces.
export const MAX_REINTENTOS = 2;

const BASE_MS = 1000;
const AZAR_MS = 300;
// Si el servidor pide esperar más que esto no se deja a la persona mirando un skeleton: se muestra el mensaje.
const ESPERA_MAXIMA_MS = 10_000;

// Solo sirve repetir cuando el problema puede cambiar solo: la conexión o el servidor. Un 4xx no se
// arregla mandando lo mismo. Es lo que decide si se ofrece el botón Reintentar.
export function esReintentable(error) {
  return error?.status === 0 || error?.status >= 500;
}

// El 429 es la excepción dentro de los 4xx: se reintenta solo, pero nunca se le ofrece un botón a la persona.
export function debeReintentar(fallos, error) {
  if (fallos >= MAX_REINTENTOS) return false;
  if (error?.status === 429) return (error.retryAfterMs ?? 0) <= ESPERA_MAXIMA_MS;
  return esReintentable(error);
}

// Backoff exponencial con azar, para que los clientes no reintenten todos juntos. Retry-After manda.
export function demoraReintento(fallos, error, azar = Math.random) {
  return error?.retryAfterMs ?? BASE_MS * 2 ** fallos + azar() * AZAR_MS;
}
