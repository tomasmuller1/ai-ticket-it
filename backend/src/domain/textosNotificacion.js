import { formatearMonto } from "../utils/formato.js";

// Título y cuerpo de cada notificación. Son funciones puras: las usan NotificacionesService al avisar y el seed
// para sus notificaciones de ejemplo. Un texto se cambia acá y en ningún otro lado.

const LARGO_MAXIMO_CUERPO = 120;
// Código con el que ComprasService#conPasarela informa que la pasarela no respondió (PasarelaNoDisponibleError).
const PASARELA_NO_DISPONIBLE = "PASARELA_NO_DISPONIBLE";

const grafemas = new Intl.Segmenter("es", { granularity: "grapheme" });

function entradas(cantidad) {
  return cantidad === 1 ? "entrada" : "entradas";
}

// Una notificación no muestra párrafos: los saltos de línea y los espacios repetidos quedan en uno solo. Se
// recorta por grafemas (lo que la persona ve como un carácter) para no partir una bandera, un emoji con tono
// de piel ni una letra con tilde combinada. El "…" cuenta dentro del largo.
function recortar(texto, largo = LARGO_MAXIMO_CUERPO) {
  const enUnaLinea = texto.replace(/\s+/g, " ").trim();
  const partes = Array.from(grafemas.segment(enUnaLinea), ({ segment }) => segment);
  if (partes.length <= largo) return enUnaLinea;
  return `${partes
    .slice(0, largo - 1)
    .join("")
    .trimEnd()}…`;
}

export function textoPagoConfirmado({ cantidad, tipoEntrada, evento }) {
  return {
    titulo: "Pago aprobado",
    cuerpo: `Ya tenés ${cantidad} ${entradas(cantidad)} ${tipoEntrada.nombre} para ${evento.nombre}.`,
  };
}

// Si la pasarela no respondió, no se rechazó nada: decirlo asustaría sin motivo.
export function textoPagoRechazado({ evento, operacionPago }) {
  const cuerpo =
    operacionPago?.motivo?.codigo === PASARELA_NO_DISPONIBLE
      ? `No pudimos comunicarnos con el medio de pago para tus entradas de ${evento.nombre}. Podés reintentarlo desde la compra.`
      : `Se rechazó el pago de tus entradas para ${evento.nombre}. Podés reintentarlo desde la compra.`;
  return { titulo: "No pudimos cobrar tu compra", cuerpo };
}

export function textoReservaVencida({ evento }) {
  return {
    titulo: "Venció tu reserva",
    cuerpo: `Pasó el plazo para pagar tus entradas de ${evento.nombre} y las liberamos.`,
  };
}

export function textoReembolso({ total, evento }) {
  return {
    titulo: "Te devolvimos el dinero",
    cuerpo: `Reintegramos ${formatearMonto(total)} de tu compra para ${evento.nombre}.`,
  };
}

export function textoEntradaUtilizada({ evento }) {
  return {
    titulo: "¡Que lo disfrutes!",
    cuerpo: `Validaron tu entrada para ${evento.nombre}. Después contanos qué te pareció.`,
  };
}

// `cantidad`: cuántos mensajes sin leer junta la notificación, contando este.
export function textoMensajeNuevo({ evento }, mensaje, cantidad = 1) {
  const autor = mensaje.usuario.nombre;
  return {
    titulo:
      cantidad > 1
        ? `${autor} te escribió ${cantidad} mensajes por ${evento.nombre}`
        : `${autor} te escribió por ${evento.nombre}`,
    cuerpo: recortar(mensaje.mensaje),
  };
}

export function textoEntradasAgotadas(evento, tipoEntrada) {
  return {
    titulo: `Se agotaron las entradas ${tipoEntrada.nombre}`,
    cuerpo: `Ya no quedan entradas ${tipoEntrada.nombre} para ${evento.nombre}.`,
  };
}

export function textoEventoAgotado(evento) {
  return { titulo: `${evento.nombre} está agotado`, cuerpo: "No quedan entradas de ningún tipo." };
}
