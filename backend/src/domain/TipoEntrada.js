import { SinCupoError, ValidacionError } from "../errors/index.js";

export class TipoEntrada {
  constructor({ id, nombre, descripcion = "", precio, cupo }) {
    if (!Number.isFinite(precio) || precio < 0) {
      throw new ValidacionError(`El precio de "${nombre}" no puede ser negativo`);
    }
    if (!Number.isInteger(cupo) || cupo < 1) {
      throw new ValidacionError(`El cupo de "${nombre}" tiene que ser un entero mayor a 0`);
    }
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.cupo = cupo;
    this.vendidas = 0;
  }

  disponibles() {
    return this.cupo - this.vendidas;
  }

  hayCupoPara(cantidad) {
    return cantidad <= this.disponibles();
  }

  reservar(cantidad) {
    if (!this.hayCupoPara(cantidad)) {
      throw new SinCupoError(`Quedan ${this.disponibles()} entradas ${this.nombre}`);
    }
    this.vendidas += cantidad;
  }

  liberar(cantidad) {
    this.vendidas = Math.max(0, this.vendidas - cantidad);
  }
}
