// Formatos para Argentina: precios en pesos sin decimales y fechas en español.
const precio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const fechaLarga = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const fechaCorta = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
const dia = new Intl.DateTimeFormat("es-AR", { day: "numeric" });
const mes = new Intl.DateTimeFormat("es-AR", { month: "short" });

export const formato = {
  precio: (valor) => (valor === 0 ? "Gratis" : precio.format(valor)),
  // Para totales y recaudación, donde 0 es "$ 0" y no "Gratis".
  monto: (valor) => precio.format(valor),
  fecha: (iso) => fechaLarga.format(new Date(iso)),
  fechaCorta: (iso) => fechaCorta.format(new Date(iso)),
  dia: (iso) => dia.format(new Date(iso)),
  mes: (iso) => mes.format(new Date(iso)).replace(".", "").toUpperCase(),
};
