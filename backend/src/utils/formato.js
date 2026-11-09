// Formatos de los textos que arma el backend (las notificaciones), iguales a los de la app (`formato` en
// mobile/src/utils/formato.js). La zona horaria va explícita: el servidor puede correr en UTC y la persona
// tiene que leer la hora del evento como la ve en Argentina.
const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

const monto = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const diaConSemana = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: ZONA_HORARIA,
});
const hora = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: ZONA_HORARIA,
});

// Intl separa con espacios duros: se pasan a espacios comunes para que el texto guardado sea predecible.
function espaciosComunes(texto) {
  return texto.replace(/\s+/g, " ");
}

// "sáb, 19 dic." → "Sáb 19 dic"
function limpiar(texto) {
  const sinPuntuacion = espaciosComunes(texto.replace(/[.,]/g, "")).trim();
  return sinPuntuacion.charAt(0).toUpperCase() + sinPuntuacion.slice(1);
}

// "$ 12.000"
export function formatearMonto(valor) {
  return espaciosComunes(monto.format(valor));
}

// "Sáb 19 dic, 21:00"
export function formatearFecha(fecha) {
  const instante = new Date(fecha);
  return `${limpiar(diaConSemana.format(instante))}, ${espaciosComunes(hora.format(instante))}`;
}
