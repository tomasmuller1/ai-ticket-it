import { ValidacionError } from "../errors/index.js";

export class Evento {
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

  yaSeRealizo(reloj) {
    return reloj.ahora() >= this.fecha;
  }

  esOrganizadoPor(usuario) {
    return this.organizador.es(usuario);
  }
}
