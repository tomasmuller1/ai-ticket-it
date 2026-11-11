import { ZONA_HORARIA } from "./formato.js";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// "2026-12-10": el día en el calendario de Argentina, aunque el servidor corra en UTC.
const diaEnArgentina = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: ZONA_HORARIA,
});

function inicioDelDia(fecha) {
  const [anio, mes, dia] = diaEnArgentina.format(fecha).split("-").map(Number);
  return Date.UTC(anio, mes - 1, dia);
}

// Cuántos días de calendario hay de `desde` a `hasta` en la hora de Argentina, sin mirar la hora: del lunes a
// las 23:00 al martes a las 01:00 hay 1. Negativo si `hasta` es anterior.
export function diasDeCalendarioEntre(desde, hasta) {
  return Math.round((inicioDelDia(hasta) - inicioDelDia(desde)) / UN_DIA_MS);
}
