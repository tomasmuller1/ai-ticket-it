import { Compra } from "../domain/Compra.js";
import { TipoEntrada } from "../domain/TipoEntrada.js";
import { RelojFijo } from "../infra/Reloj.js";

// Piezas que comparten los datos de ejemplo de base (seed.js) y los completos (seedCompleto.js).

export const UN_DIA_MS = 24 * 60 * 60 * 1000;
const UN_MINUTO_MS = 60 * 1000;

// Todos los usuarios de ejemplo tienen la contraseña "aiticketit123" (hash bcrypt precalculado,
// para no recalcularlo cada vez que se cargan los datos).
export const CONTRASENIA_DEMO = "aiticketit123";
export const HASH_DEMO = "$2b$10$PzEtasTblK.OVuJGzJlPBOK1RjboYo9vx4Y/HoJzejWBOgaWJNxOW";

// Las fechas son relativas a "hoy" para que siempre haya eventos próximos y eventos ya realizados.
export function fechaEn(hoy, dias, hora = 21) {
  const fecha = new Date(hoy.getTime() + dias * UN_DIA_MS);
  fecha.setHours(hora, 0, 0, 0);
  return fecha;
}

export function imagen(nombre) {
  return `https://picsum.photos/seed/aiticketit-${nombre}/1200/800`;
}

export function tipo(id, nombre, precio, cupo, descripcion = "") {
  return new TipoEntrada({ id, nombre, precio, cupo, descripcion });
}

// Devuelve `comprar`, que crea una compra "en el pasado" y la lleva hasta el estado pedido con relojes fijos,
// usando los métodos del dominio (así el cupo, el historial y las reseñas quedan coherentes). Va sumando cada
// compra a `compras` y cada reseña a `resenias`.
//
// La compra se hace `diasAntes` días antes de hoy (o del evento, si ya pasó). Cada mensaje es
// [autor, texto, minutos]: los minutos se cuentan desde la compra. Una compra que se cancela lo hace
// `cancelaEnMinutos` después de comprarla (por defecto, en el mismo momento).
export function crearComprador({ hoy, compras, resenias }) {
  return function comprar(
    id,
    comprador,
    evento,
    tipoEntradaId,
    cantidad,
    estado,
    { resenia, mensajes = [], diasAntes = 20, cancelaEnMinutos = 0 } = {},
  ) {
    const inicio = Math.min(hoy.getTime(), evento.fecha.getTime()) - diasAntes * UN_DIA_MS;
    const momentoCompra = new RelojFijo(inicio);
    const compra = Compra.crear({ id, comprador, evento, tipoEntradaId, cantidad, reloj: momentoCompra });

    for (const [autor, texto, minutos = 0] of mensajes) {
      compra.enviarMensaje(texto, autor, new RelojFijo(inicio + minutos * UN_MINUTO_MS));
    }
    // Una entrada gratis nace CONFIRMADA: no hay nada que pagar.
    const sinPagar = estado === "PENDIENTE" || estado === "CANCELADA_SIN_PAGO";
    if (!sinPagar && compra.estado === "PENDIENTE") {
      compra.pagar(comprador, momentoCompra);
    }
    const momentoCancelacion = new RelojFijo(inicio + cancelaEnMinutos * UN_MINUTO_MS);
    if (estado === "CANCELADA_SIN_PAGO") {
      compra.cancelar(comprador, momentoCancelacion);
    }
    if (estado === "REEMBOLSADA") {
      compra.cancelar(comprador, momentoCancelacion);
      compra.reembolsar(momentoCancelacion);
    }
    if (estado === "UTILIZADA") {
      compra.marcarUtilizada(evento.organizador, new RelojFijo(evento.fecha));
      if (resenia) {
        const despues = new RelojFijo(evento.fecha.getTime() + UN_DIA_MS);
        resenias.push(compra.reseniar({ id: `r-${id}`, ...resenia }, comprador, despues));
      }
    }
    compras.push(compra);
    return compra;
  };
}
