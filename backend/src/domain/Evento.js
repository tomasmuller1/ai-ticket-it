import { EventoCanceladoError, EventoFinalizadoError, ValidacionError } from "../errors/index.js";

// POSPUESTO: el organizador cambió la fecha y las entradas siguen valiendo. CANCELADO: no se va a hacer; las
// compras se cancelan y se reembolsan (ComprasService#resolverCancelacionDeEvento).
export const EstadoEvento = Object.freeze({
  PROGRAMADO: "PROGRAMADO",
  POSPUESTO: "POSPUESTO",
  CANCELADO: "CANCELADO",
});

export class Evento {
  // Cuánto antes, como mínimo, tiene que ser la nueva fecha al posponer (o adelantar) el evento.
  static ANTICIPACION_MINIMA_MS = 2 * 24 * 60 * 60 * 1000;

  constructor({
    id,
    nombre,
    descripcion,
    categoria,
    fecha,
    lugar,
    multimedia = [],
    organizador,
    tiposEntrada,
    estado = EstadoEvento.PROGRAMADO,
  }) {
    if (!tiposEntrada?.length) {
      throw new ValidacionError("El evento tiene que tener al menos un tipo de entrada");
    }
    const nombres = tiposEntrada.map((tipo) => tipo.nombre.trim().toLowerCase());
    if (new Set(nombres).size !== nombres.length) {
      throw new ValidacionError("Hay tipos de entrada con el mismo nombre");
    }
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.categoria = categoria;
    this.fecha = new Date(fecha);
    this.lugar = lugar;
    this.multimedia = multimedia;
    this.organizador = organizador;
    this.tiposEntrada = tiposEntrada;
    this.estado = estado;
  }

  tipoEntrada(id) {
    return this.tiposEntrada.find((tipo) => tipo.id === id);
  }

  precioDesde() {
    return Math.min(...this.tiposEntrada.map((tipo) => tipo.precio));
  }

  // Verdadero si alguno de sus tipos de entrada cuesta entre min y max (cualquiera de los dos puede faltar).
  tuPrecioEstaEntre(min = 0, max = Infinity) {
    return this.tiposEntrada.some((tipo) => tipo.precio >= min && tipo.precio <= max);
  }

  // Sin entradas disponibles de ningún tipo, contando las reservas sin pagar.
  agotado() {
    return this.tiposEntrada.every((tipo) => tipo.disponibles() === 0);
  }

  yaSeRealizo(reloj) {
    return reloj.ahora() >= this.fecha;
  }

  esOrganizadoPor(usuario) {
    return this.organizador.es(usuario);
  }

  estaCancelado() {
    return this.estado === EstadoEvento.CANCELADO;
  }

  // Cambia la fecha y devuelve la anterior, para avisarles a los compradores. Las entradas siguen valiendo.
  // La nueva puede ser posterior o anterior a la actual (adelantarlo también es cambiarle la fecha), pero a
  // `ANTICIPACION_MINIMA_MS` de ahora como mínimo, para que los compradores se enteren a tiempo.
  posponer(nuevaFecha, reloj) {
    this.#exigirGestionable(reloj);
    const fecha = new Date(nuevaFecha);
    if (fecha.getTime() === this.fecha.getTime()) {
      throw new ValidacionError("La nueva fecha tiene que ser distinta de la actual");
    }
    if (fecha.getTime() < reloj.ahora().getTime() + Evento.ANTICIPACION_MINIMA_MS) {
      throw new ValidacionError("La nueva fecha tiene que ser dentro de 2 días como mínimo");
    }
    const anterior = this.fecha;
    this.fecha = fecha;
    this.estado = EstadoEvento.POSPUESTO;
    return anterior;
  }

  cancelar(reloj) {
    this.#exigirGestionable(reloj);
    this.estado = EstadoEvento.CANCELADO;
  }

  #exigirGestionable(reloj) {
    if (this.estaCancelado()) throw new EventoCanceladoError();
    if (this.yaSeRealizo(reloj)) throw new EventoFinalizadoError();
  }
}
