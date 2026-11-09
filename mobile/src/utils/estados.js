// Filtros por estado de compra, en el orden del ciclo de vida. Los usan Mis entradas y la gestión del evento.
export const FILTROS_ESTADO = [
  { estado: undefined, etiqueta: "Todas" },
  { estado: "PENDIENTE", etiqueta: "Pendientes" },
  { estado: "CONFIRMADA", etiqueta: "Confirmadas" },
  { estado: "UTILIZADA", etiqueta: "Utilizadas" },
  { estado: "CANCELADA", etiqueta: "Canceladas" },
  { estado: "REEMBOLSADA", etiqueta: "Reembolsadas" },
];

// Insignia de un evento que no sigue su curso normal; un evento PROGRAMADO no lleva ninguna. `color` es un token de
// `colores` (nunca solo color: la insignia siempre lleva el texto).
const ESTADOS_EVENTO = {
  POSPUESTO: { texto: "Nueva fecha", color: "aviso" },
  CANCELADO: { texto: "Cancelado", color: "peligro" },
};

export function etiquetaEstadoEvento(estado) {
  return ESTADOS_EVENTO[estado] ?? null;
}

// Lo que le pasó al evento, dicho al comprador en el listado y en el detalle de su compra.
export function avisoDeEventoParaCompra(estado) {
  if (estado === "CANCELADO") return "El organizador canceló el evento.";
  if (estado === "POSPUESTO") return "El evento se pospuso.";
  return null;
}
