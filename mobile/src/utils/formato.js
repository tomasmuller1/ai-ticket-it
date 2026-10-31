// Formatos para Argentina: precios en pesos sin decimales, fechas en español y horario de 24 horas.
const precio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const diaConSemana = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" });
const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fechaCorta = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
const dia = new Intl.DateTimeFormat("es-AR", { day: "numeric" });
const mes = new Intl.DateTimeFormat("es-AR", { month: "short" });

// "jue, 5 nov." → "Jue 5 nov"
function limpiar(texto) {
  const sinPuntuacion = texto.replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
  return sinPuntuacion.charAt(0).toUpperCase() + sinPuntuacion.slice(1);
}

export const formato = {
  precio: (valor) => (valor === 0 ? "Gratis" : precio.format(valor)),
  // Para totales y recaudación, donde 0 es "$ 0" y no "Gratis".
  monto: (valor) => precio.format(valor),
  // "Jue 5 nov · 22:00"
  fecha: (iso) => `${formato.dia(iso)} · ${formato.hora(iso)}`,
  // "Jue 5 nov"
  dia: (iso) => limpiar(diaConSemana.format(new Date(iso))),
  hora: (iso) => hora.format(new Date(iso)),
  fechaCorta: (iso) => fechaCorta.format(new Date(iso)).replace(".", ""),
  diaDelMes: (iso) => dia.format(new Date(iso)),
  mes: (iso) => limpiar(mes.format(new Date(iso))),
};
