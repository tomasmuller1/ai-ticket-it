import { EstadoCompra } from "./estados/EstadoCompra.js";
import { formatearFecha, formatearMonto } from "../utils/formato.js";

// Título y cuerpo de cada notificación. Son funciones puras: las usan NotificacionesService al avisar y el seed
// para sus notificaciones de ejemplo. Un texto se cambia acá y en ningún otro lado.

const LARGO_MAXIMO_CUERPO = 120;
// Código con el que ComprasService#conPasarela informa que la pasarela no respondió (PasarelaNoDisponibleError).
const PASARELA_NO_DISPONIBLE = "PASARELA_NO_DISPONIBLE";

const grafemas = new Intl.Segmenter("es", { granularity: "grapheme" });

function entradas(cantidad) {
  return cantidad === 1 ? "entrada" : "entradas";
}

// El motivo que escribió el organizador va al final, tal cual pero en una sola línea.
function conMotivo(cuerpo, motivo) {
  const linea = motivo ? enUnaLinea(motivo) : "";
  return linea ? `${cuerpo} Motivo: ${linea}` : cuerpo;
}

// Una notificación no muestra párrafos: los saltos de línea y los espacios repetidos quedan en uno solo.
function enUnaLinea(texto) {
  return texto.replace(/\s+/g, " ").trim();
}

// Se recorta por grafemas (lo que la persona ve como un carácter) para no partir una bandera, un emoji con
// tono de piel ni una letra con tilde combinada. El "…" cuenta dentro del largo.
function recortar(texto, largo = LARGO_MAXIMO_CUERPO) {
  const linea = enUnaLinea(texto);
  const partes = Array.from(grafemas.segment(linea), ({ segment }) => segment);
  if (partes.length <= largo) return linea;
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

// Qué pasa con la entrada de una compra vigente cuando el evento cambia de fecha. Las UTILIZADAS llegan acá ya
// CONFIRMADAS (ComprasService#reabrirEntradasPorPostergacion), así que siempre la pueden cancelar.
function quePasaConLaEntrada({ estado, pagoEnProceso }) {
  if (estado !== EstadoCompra.PENDIENTE) {
    return "Tu entrada sigue valiendo; si no podés ir, cancelá la compra y te devolvemos el dinero.";
  }
  return pagoEnProceso
    ? "Tu pago está en proceso: si se acredita, tu entrada vale para la nueva fecha."
    : "Si todavía querés ir, completá el pago antes de que venza tu reserva.";
}

// `fechaAnterior` es la que devolvió Evento#posponer; la nueva ya está en el evento.
export function textoEventoPospuesto(compra, { fechaAnterior, motivo }) {
  const { evento } = compra;
  return {
    titulo: `${evento.nombre} se pospuso`,
    cuerpo: conMotivo(
      `La nueva fecha es ${formatearFecha(evento.fecha)} (era ${formatearFecha(fechaAnterior)}). ${quePasaConLaEntrada(compra)}`,
      motivo,
    ),
  };
}

// Se arma antes de cancelar la compra: si pagó, el reembolso todavía no salió (llega aparte, con
// REEMBOLSO_REALIZADO). Con el cobro en camino todavía no se sabe si se va a acreditar.
function quePasaConLaPlata({ fuePagada, pagoEnProceso, total }) {
  if (fuePagada) return `Te devolvemos ${formatearMonto(total)} a tu tarjeta.`;
  if (pagoEnProceso) {
    return `Tu pago estaba en proceso: si se llega a acreditar, te devolvemos ${formatearMonto(total)} a tu tarjeta.`;
  }
  return "Tu reserva quedó sin efecto y no se te cobró nada.";
}

export function textoEventoCancelado(compra, { motivo } = {}) {
  return {
    titulo: `Se canceló ${compra.evento.nombre}`,
    cuerpo: conMotivo(quePasaConLaPlata(compra), motivo),
  };
}
