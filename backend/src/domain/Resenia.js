import { ValidacionError } from "../errors/index.js";

export class Resenia {
  static PUNTUACION_MINIMA = 1;
  static PUNTUACION_MAXIMA = 5;
  static LARGO_MAXIMO_DETALLE = 500;

  constructor({ id, comprador, evento, puntuacion, detalle = "", fecha }) {
    if (
      !Number.isInteger(puntuacion) ||
      puntuacion < Resenia.PUNTUACION_MINIMA ||
      puntuacion > Resenia.PUNTUACION_MAXIMA
    ) {
      throw new ValidacionError("La puntuación tiene que ser un número entero del 1 al 5");
    }
    const detalleLimpio = detalle.trim();
    if (detalleLimpio.length > Resenia.LARGO_MAXIMO_DETALLE) {
      throw new ValidacionError(
        `El comentario no puede superar los ${Resenia.LARGO_MAXIMO_DETALLE} caracteres`,
      );
    }
    this.id = id;
    this.comprador = comprador;
    this.evento = evento;
    this.puntuacion = puntuacion;
    this.detalle = detalleLimpio;
    this.fecha = fecha;
  }

  // Promedio con un decimal, o null si todavía no hay reseñas.
  static promedio(resenias) {
    if (resenias.length === 0) return null;
    const suma = resenias.reduce((total, resenia) => total + resenia.puntuacion, 0);
    return Math.round((suma / resenias.length) * 10) / 10;
  }
}
