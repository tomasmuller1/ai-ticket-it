// Registro de cada transición de una compra: a qué estado pasó, quién lo hizo (null si fue el sistema) y cuándo.
export class CambioEstadoCompra {
  constructor({ estado, quien, fechaHora }) {
    this.estado = estado;
    this.quien = quien;
    this.fechaHora = fechaHora;
  }
}
