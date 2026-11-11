// Qué abre cada notificación y cómo se ve. El texto lo arma el backend; la app solo decide a dónde lleva.

// Los avisos de agotado le llegan al organizador: abren la gestión de su evento.
const AGOTADOS = new Set(["ENTRADAS_AGOTADAS", "EVENTO_AGOTADO"]);

// Un mensaje abre el chat; un agotado, la gestión del evento; el resto, la compra a la que se refiere o, si no
// hay compra, el evento.
export function rutaDeNotificacion(n) {
  if (n.tipo === "MENSAJE_NUEVO") return `/compra/${n.compraId}/chat`;
  if (AGOTADOS.has(n.tipo)) return `/organizador/evento/${n.evento.id}`;
  if (n.compraId) return `/compra/${n.compraId}`;
  return `/evento/${n.evento.id}`;
}

// Íconos de Ionicons. Un tipo que la app todavía no conoce usa la campana.
const ICONOS = {
  PAGO_CONFIRMADO: "checkmark-circle",
  PAGO_RECHAZADO: "close-circle",
  RESERVA_VENCIDA: "time",
  REEMBOLSO_REALIZADO: "cash",
  ENTRADA_UTILIZADA: "ticket",
  MENSAJE_NUEVO: "chatbubble",
  COMPRA_DEVUELTA: "return-down-back",
  ENTRADAS_AGOTADAS: "flame",
  EVENTO_AGOTADO: "flame",
  EVENTO_POSPUESTO: "calendar",
  EVENTO_CANCELADO: "ban",
};

export function iconoDeNotificacion(tipo) {
  return ICONOS[tipo] ?? "notifications";
}

// Texto de la burbuja de la pestaña: hasta 9 el número y después "9+", para que no crezca sobre el ícono.
// Sin no leídas no hay burbuja.
export function textoBurbuja(noLeidas) {
  if (!noLeidas) return undefined;
  return noLeidas > 9 ? "9+" : String(noLeidas);
}

// Lo que oye el lector en cada notificación: "Sin leer." si corresponde, el título, el cuerpo y cuándo llegó,
// como oraciones. Los textos los arma el backend y pueden terminar en "!", "?" o "…": el punto se suma solo si
// falta, para que no quede "!." ni "..".
const TERMINA_EN_PUNTUACION = /[.!?…:;]$/;

const oracion = (texto) => (TERMINA_EN_PUNTUACION.test(texto) ? texto : `${texto}.`);

export function etiquetaDeNotificacion({ titulo, cuerpo, leida }, cuando) {
  const oraciones = [titulo, cuerpo].map(oracion).join(" ");
  return `${leida ? "" : "Sin leer. "}${oraciones} ${cuando}`;
}
