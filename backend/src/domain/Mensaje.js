import { ValidacionError } from "../errors/index.js";

export class Mensaje {
  static LARGO_MAXIMO = 1000;

  constructor({ id, usuario, mensaje, enviado }) {
    const texto = mensaje?.trim() ?? "";
    if (texto.length === 0) {
      throw new ValidacionError("El mensaje no puede estar vacío");
    }
    if (texto.length > Mensaje.LARGO_MAXIMO) {
      throw new ValidacionError(`El mensaje no puede superar los ${Mensaje.LARGO_MAXIMO} caracteres`);
    }
    this.id = id;
    this.usuario = usuario;
    this.mensaje = texto;
    this.enviado = enviado;
  }
}
