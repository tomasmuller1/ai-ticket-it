// Toda regla que dependa de "ahora" recibe un reloj, así los tests pueden fijar la fecha.
export class Reloj {
  ahora() {
    return new Date();
  }
}

export class RelojFijo {
  constructor(fecha) {
    this.fecha = new Date(fecha);
  }

  ahora() {
    return new Date(this.fecha);
  }
}
