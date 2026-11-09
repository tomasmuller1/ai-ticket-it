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
// `colores` (nunca solo color: la insignia siempre lleva el texto). "Nueva fecha" es el único nombre del evento
// pospuesto en una insignia, y anuncia una fecha que todavía no llegó: con el evento ya realizado no se muestra.
// "Cancelado" se muestra siempre.
const ESTADOS_EVENTO = {
  POSPUESTO: { texto: "Nueva fecha", color: "aviso" },
  CANCELADO: { texto: "Cancelado", color: "peligro" },
};

export function etiquetaEstadoEvento(estado, { finalizado = false } = {}) {
  if (estado === "POSPUESTO" && finalizado) return null;
  return ESTADOS_EVENTO[estado] ?? null;
}

// Lo que le pasó al evento, dicho al comprador en el listado y en el detalle de su compra.
export function avisoDeEventoParaCompra(estado) {
  if (estado === "CANCELADO") return "El organizador canceló el evento.";
  if (estado === "POSPUESTO") return "El evento se pospuso.";
  return null;
}
