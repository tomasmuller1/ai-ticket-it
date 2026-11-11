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

const MINUTO_MS = 60_000;
const HORA_MS = 60 * MINUTO_MS;
const DIA_MS = 24 * HORA_MS;

// El mismo día del calendario del celular, sin importar la hora.
function mismoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "Recién", "Hace 5 min", "Hace 3 h", "Ayer" y, desde ahí, "2 nov". Una fecha un poco adelantada (el reloj
// del celular atrasa) cuenta como recién.
function haceCuanto(iso, ahora = new Date()) {
  const fecha = new Date(iso);
  const pasado = ahora - fecha;
  if (pasado < MINUTO_MS) return "Recién";
  if (pasado < HORA_MS) return `Hace ${Math.floor(pasado / MINUTO_MS)} min`;
  if (pasado < DIA_MS) return `Hace ${Math.floor(pasado / HORA_MS)} h`;
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (mismoDia(fecha, ayer)) return "Ayer";
  return formato.fechaCorta(iso);
}

// Lo que falta para el evento de una compra CONFIRMADA (CU1), con lo que calcula el backend: en días si falta uno
// o más y, si no, en horas o minutos, para no decir "falta 1 día" a dos horas de empezar. En minúscula, para
// usarlo dentro de una oración; null si la compra no está CONFIRMADA.
function tiempoRestante(dias, minutos) {
  if (dias === null || dias === undefined) return null;
  if (dias >= 1) return dias === 1 ? "falta 1 día" : `faltan ${dias} días`;
  if (minutos === null || minutos === undefined) return "es hoy";
  const horas = Math.floor(minutos / 60);
  if (horas >= 1) return horas === 1 ? "falta 1 hora" : `faltan ${horas} horas`;
  if (minutos >= 1) return minutos === 1 ? "falta 1 minuto" : `faltan ${minutos} minutos`;
  return "ya empezó";
}

export const formato = {
  precio: (valor) => (valor === 0 ? "Gratis" : precio.format(valor)),
  // Para totales y recaudación, donde 0 es "$ 0" y no "Gratis".
  monto: (valor) => precio.format(valor),
  // "Jue 5 nov, 22:00"
  fecha: (iso) => `${formato.dia(iso)}, ${formato.hora(iso)}`,
  // "Jue 5 nov"
  dia: (iso) => limpiar(diaConSemana.format(new Date(iso))),
  hora: (iso) => hora.format(new Date(iso)),
  fechaCorta: (iso) => fechaCorta.format(new Date(iso)).replace(".", ""),
  diaDelMes: (iso) => dia.format(new Date(iso)),
  mes: (iso) => limpiar(mes.format(new Date(iso))),
  // Puntaje con coma decimal: "4,0"
  puntaje: (valor) => valor.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  haceCuanto,
  tiempoRestante,
};
