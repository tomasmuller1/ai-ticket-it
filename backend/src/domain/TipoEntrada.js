export class TipoEntrada {
  constructor({ id, nombre, precio, cupo }) {
    this.id = id;
    this.nombre = nombre;
    this.precio = precio;
    this.cupo = cupo;
    this.vendidas = 0;
  }

  disponibles() {
    return this.cupo - this.vendidas;
  }
}
