import { randomUUID } from "node:crypto";

import {
  EventoFinalizadoError,
  ProhibidoError,
  ReglaNegocioError,
  TransicionInvalidaError,
  ValidacionError,
} from "../errors/index.js";
import { CambioEstadoCompra } from "./CambioEstadoCompra.js";
import { Mensaje } from "./Mensaje.js";
import { Resenia } from "./Resenia.js";
import { EstadoCompra } from "./estados/EstadoCompra.js";
import { Pendiente } from "./estados/Pendiente.js";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export class Compra {
  static CANTIDAD_MAXIMA = 10;

  #estado;

  // Crea la compra validando las reglas del CU12 y reservando el cupo. Queda PENDIENTE de pago.
  static crear({ id, comprador, evento, tipoEntradaId, cantidad, reloj }) {
    const tipoEntrada = evento.tipoEntrada(tipoEntradaId);
    if (!tipoEntrada) {
      throw new ValidacionError("El tipo de entrada no pertenece a este evento");
    }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > Compra.CANTIDAD_MAXIMA) {
      throw new ValidacionError(`La cantidad tiene que ser un entero entre 1 y ${Compra.CANTIDAD_MAXIMA}`);
    }
    if (evento.esOrganizadoPor(comprador)) {
      throw new ReglaNegocioError("No podés comprar entradas de tu propio evento", "PROPIO_EVENTO");
    }
    if (evento.yaSeRealizo(reloj)) {
      throw new EventoFinalizadoError();
    }

    tipoEntrada.reservar(cantidad);
    const compra = new Compra({ id, comprador, evento, tipoEntrada, cantidad });
    compra.actualizarEstado(new Pendiente(), comprador, reloj);
    return compra;
  }

  constructor({ id, comprador, evento, tipoEntrada, cantidad }) {
    this.id = id;
    this.comprador = comprador;
    this.evento = evento;
    this.tipoEntrada = tipoEntrada;
    this.cantidad = cantidad;
    this.precioUnitario = tipoEntrada.precio;
    this.total = tipoEntrada.precio * cantidad;
    this.historial = [];
    this.mensajes = [];
    this.resenia = null;
  }

  get estado() {
    return this.#estado.nombre;
  }

  get fechaCreacion() {
    return this.historial[0].fechaHora;
  }

  get fuePagada() {
    return this.historial.some((cambio) => cambio.estado === EstadoCompra.CONFIRMADA);
  }

  // Única forma de cambiar de estado: siempre deja registro en el historial.
  actualizarEstado(nuevoEstado, quien, reloj) {
    this.#estado = nuevoEstado;
    this.historial.push(
      new CambioEstadoCompra({ estado: nuevoEstado.nombre, quien, fechaHora: reloj.ahora() }),
    );
  }

  liberarCupo() {
    this.tipoEntrada.liberar(this.cantidad);
  }

  esComprador(usuario) {
    return this.comprador.es(usuario);
  }

  esOrganizador(usuario) {
    return this.evento.esOrganizadoPor(usuario);
  }

  puedeVer(usuario) {
    return this.esComprador(usuario) || this.esOrganizador(usuario);
  }

  pagar(quien, reloj) {
    this.#exigirComprador(quien);
    this.#exigirEventoPendiente(reloj);
    this.#estado.pagar(this, quien, reloj);
  }

  cancelar(quien, reloj) {
    this.#exigirComprador(quien);
    this.#exigirEventoPendiente(reloj);
    this.#estado.cancelar(this, quien, reloj);
  }

  marcarUtilizada(quien, reloj) {
    if (!this.esOrganizador(quien)) {
      throw new ProhibidoError("Solo el organizador del evento puede validar entradas");
    }
    this.#estado.marcarUtilizada(this, quien, reloj);
  }

  // Lo dispara el sistema cuando la pasarela confirma la devolución del dinero.
  reembolsar(reloj) {
    this.#estado.reembolsar(this, reloj);
  }

  requiereReembolso() {
    return this.estado === EstadoCompra.CANCELADA && this.fuePagada;
  }

  // Días que faltan para el evento; solo tiene sentido con la compra CONFIRMADA (CU1).
  diasRestantes(reloj) {
    if (this.estado !== EstadoCompra.CONFIRMADA) return null;
    const faltan = this.evento.fecha - reloj.ahora();
    return Math.max(0, Math.ceil(faltan / UN_DIA_MS));
  }

  enviarMensaje(texto, usuario, reloj) {
    if (!this.puedeVer(usuario)) {
      throw new ProhibidoError("Solo el comprador y el organizador pueden escribir en este chat");
    }
    const mensaje = new Mensaje({ id: randomUUID(), usuario, mensaje: texto, enviado: reloj.ahora() });
    this.mensajes.push(mensaje);
    return mensaje;
  }

  reseniar({ id, puntuacion, detalle }, quien, reloj) {
    this.#exigirComprador(quien);
    if (!this.#estado.permite("reseniar")) {
      throw new TransicionInvalidaError(`No se puede reseñar una compra ${this.estado}`);
    }
    if (this.resenia) {
      throw new ReglaNegocioError("Ya dejaste una reseña para esta compra", "YA_RESENIADA");
    }
    this.resenia = new Resenia({
      id,
      comprador: this.comprador,
      evento: this.evento,
      puntuacion,
      detalle,
      fecha: reloj.ahora(),
    });
    return this.resenia;
  }

  // Qué puede hacer este usuario con la compra ahora mismo. La app muestra los botones según esto.
  accionesPermitidas(usuario, reloj) {
    const esComprador = this.esComprador(usuario);
    const eventoPendiente = !this.evento.yaSeRealizo(reloj);
    return {
      pagar: esComprador && eventoPendiente && this.#estado.permite("pagar"),
      cancelar: esComprador && eventoPendiente && this.#estado.permite("cancelar"),
      validar: this.esOrganizador(usuario) && this.#estado.permite("marcarUtilizada"),
      reseniar: esComprador && !this.resenia && this.#estado.permite("reseniar"),
      chatear: this.puedeVer(usuario),
    };
  }

  #exigirComprador(usuario) {
    if (!this.esComprador(usuario)) {
      throw new ProhibidoError("Solo quien hizo la compra puede realizar esta acción");
    }
  }

  #exigirEventoPendiente(reloj) {
    if (this.evento.yaSeRealizo(reloj)) {
      throw new EventoFinalizadoError();
    }
  }
}
