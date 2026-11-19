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

// Fotos de Pexels, elegidas a mano para cada evento. Su licencia permite usarlas gratis y sin atribución
// (https://www.pexels.com/license/). El CDN las devuelve recortadas a 1200 x 800, como las muestra la app.
const FOTOS = {
  // Datos de base.
  "e-rock-nacional": [1763075, 15016180],
  "e-jazz-club": [9419224, 9419374],
  "e-hamlet": [713149, 4722571],
  "e-musical": [12687124],
  "e-stand-up": [10078868],
  "e-superclasico": [30555514, 31040982],
  "e-maraton": [2402777, 34605161],
  "e-ia-conf": [29180740, 11329860],
  "e-festival": [14670407, 32072177],
  "e-tango": [17914069],
  "e-impro": [17013753],
  "e-indie": [2601186, 2601215],
  // Datos completos.
  "e-cuarteto": [3249760, 5156606],
  "e-yoga": [8172933, 5384534],
  "e-obra-infantil": [7356476, 7356480],
  "e-folklore": [4035347, 2419535],
  "e-bernarda": [4722577],
  "e-futbol": [4219812, 1884576],
  "e-fotografia": [3716556, 827209],
  "e-monologos": [1840320],
  "e-tributo-80": [16118368, 27817822],
  "e-sinfonica": [5933199, 32545976],
  "e-devconf": [15448072, 20733081],
  "e-electronica": [9534913, 7715524],
  "e-ballet": [358010, 27555519],
  "e-startups": [8761555],
  "e-humor": [31474150],
  "e-tenis": [171568, 27151849],
  "e-food-fest": [5321638, 25078442],
  "e-cumbia": [18701329, 14699845],
  "e-trail": [30932860, 32132278],
  "e-meetup-ux": [7710049, 29521529],
  "e-cine": [6521574, 14551498],
  "e-carroza": [6896181, 1049746],
  "e-big-band": [343683, 5678612],
  "e-stand-up-verano": [2101487],
};

export function fotosDe(eventoId) {
  const ids = FOTOS[eventoId];
  if (!ids) throw new Error(`El evento de ejemplo ${eventoId} no tiene fotos`);
  return ids.map(
    (id) =>
      `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800`,
  );
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
