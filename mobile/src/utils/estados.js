// Filtros por estado de compra, en el orden del ciclo de vida. Los usan Mis entradas y la gestión del evento.
export const FILTROS_ESTADO = [
  { estado: undefined, etiqueta: "Todas" },
  { estado: "PENDIENTE", etiqueta: "Pendientes" },
  { estado: "CONFIRMADA", etiqueta: "Confirmadas" },
  { estado: "UTILIZADA", etiqueta: "Utilizadas" },
  { estado: "CANCELADA", etiqueta: "Canceladas" },
  { estado: "REEMBOLSADA", etiqueta: "Reembolsadas" },
];
