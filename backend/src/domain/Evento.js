export class Evento {
  constructor({ id, titulo, descripcion, categoria, fecha, lugar, organizadorId, tiposEntrada = [] }) {
    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.categoria = categoria;
    this.fecha = fecha;
    this.lugar = lugar;
    this.organizadorId = organizadorId;
    this.tiposEntrada = tiposEntrada;
  }

  precioDesde() {
    return Math.min(...this.tiposEntrada.map((tipo) => tipo.precio));
  }
}
