import { randomUUID } from "node:crypto";

import {
  EventoCanceladoError,
  EventoFinalizadoError,
  PagoEnProcesoError,
  ProhibidoError,
  ReglaNegocioError,
  ReservaVencidaError,
  TransicionInvalidaError,
  ValidacionError,
} from "../errors/index.js";
import { CambioEstadoCompra } from "./CambioEstadoCompra.js";
import { Mensaje } from "./Mensaje.js";
import { OperacionPago } from "./OperacionPago.js";
import { Resenia } from "./Resenia.js";
import { EstadoCompra } from "./estados/EstadoCompra.js";
import { Pendiente } from "./estados/Pendiente.js";

const UN_DIA_MS = 24 * 60 * 60 * 1000;
// Las que tienen las entradas tomadas: las que se cancelan si se cancela el evento y las que reciben sus avisos.
const ESTADOS_VIGENTES = [EstadoCompra.PENDIENTE, EstadoCompra.CONFIRMADA, EstadoCompra.UTILIZADA];

export class Compra {
  static CANTIDAD_MAXIMA = 10;
  // Tras un pago rechazado la persona tiene este margen para reintentar, aunque el plazo ya haya pasado.
  static GRACIA_TRAS_RECHAZO_MS = 5 * 60 * 1000;
  // La app muestra `venceEn` como plazo, pero se da por vencida un margen después: un "Pagar" tocado a tiempo
  // llega al servidor antes de que el barrido cancele la reserva (el timeout de la app es menor que esto).
  static MARGEN_PAGO_EN_CAMINO_MS = 60 * 1000;

  #estado;

  // Crea la compra validando las reglas del CU12 y reservando el cupo. Queda PENDIENTE de pago.
  // Con `venceEn`, la reserva se cancela sola si no se paga a tiempo; sin él, no vence.
  static crear({ id, comprador, evento, tipoEntradaId, cantidad, reloj, venceEn = null }) {
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
    if (evento.estaCancelado()) {
      throw new EventoCanceladoError();
    }
    if (evento.yaSeRealizo(reloj)) {
      throw new EventoFinalizadoError();
    }

    tipoEntrada.reservar(cantidad);
    const compra = new Compra({ id, comprador, evento, tipoEntrada, cantidad, venceEn });
    compra.actualizarEstado(new Pendiente(), comprador, reloj);
    return compra;
  }

  constructor({ id, comprador, evento, tipoEntrada, cantidad, venceEn = null }) {
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
    this.operacionPago = null;
    this.venceEn = venceEn;
    this.canceladaPorVencimiento = false;
  }

  get pagoEnProceso() {
    return Boolean(this.operacionPago?.pendiente);
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

  get vigente() {
    return ESTADOS_VIGENTES.includes(this.estado);
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

  // Verifica que se pueda pagar sin cambiar nada: el service la usa antes de cobrar en la pasarela.
  verificarPago(quien, reloj) {
    this.#exigirComprador(quien);
    this.#exigirEventoPendiente(reloj);
    if (!this.#estado.permite("pagar")) {
      if (this.canceladaPorVencimiento) throw new ReservaVencidaError();
      this.#estado.rechazar("pagar");
    }
    if (this.pagoEnProceso) throw new PagoEnProcesoError();
  }

  // El cobro tarda: se registra el intento y la compra sigue PENDIENTE hasta conocer el resultado.
  iniciarPago({ id, tarjetaId }, quien, reloj) {
    this.verificarPago(quien, reloj);
    this.operacionPago = new OperacionPago({
      id,
      compraId: this.id,
      tarjetaId,
      fechaCreacion: reloj.ahora(),
    });
    return this.operacionPago;
  }

  // La pasarela ya cobró: no se vuelve a mirar la fecha del evento, que pudo empezar mientras se procesaba.
  confirmarPago(transaccionId, reloj) {
    this.#estado.pagar(this, this.comprador, reloj);
    this.transaccionPago = transaccionId;
    this.operacionPago.aprobar(reloj);
  }

  rechazarPago(motivo, reloj) {
    this.operacionPago.rechazar(motivo, reloj);
    if (this.venceEn) {
      const finDeLaGracia = new Date(reloj.ahora().getTime() + Compra.GRACIA_TRAS_RECHAZO_MS);
      this.venceEn = new Date(Math.max(this.venceEn.getTime(), finDeLaGracia.getTime()));
    }
  }

  // La hora límite solo tiene sentido mientras la reserva sigue sin resolverse.
  get reservaVenceEn() {
    return this.estado === EstadoCompra.PENDIENTE ? this.venceEn : null;
  }

  // Tres momentos de una reserva sin pagar:
  // 1. plazoDePagoCumplido: llegó la hora que muestra la app. Ya no se ofrece pagar, pero sigue PENDIENTE, con el
  //    cupo tomado, y el pago que venía en camino se acepta. Todavía no se puede decir que venció.
  // 2. correspondeVencer: pasó también el margen. El próximo barrido la cancela.
  // 3. canceladaPorVencimiento: el barrido la canceló. Recién acá venció y se liberaron las entradas.
  plazoDePagoCumplido(reloj) {
    return (
      this.estado === EstadoCompra.PENDIENTE &&
      !this.pagoEnProceso &&
      this.venceEn !== null &&
      reloj.ahora() >= this.venceEn
    );
  }

  // Un "Pagar" tocado a tiempo llega antes del margen. Con un pago en proceso no corresponde, sin importar
  // cuánto tarde.
  correspondeVencer(reloj) {
    return (
      this.plazoDePagoCumplido(reloj) &&
      reloj.ahora().getTime() >= this.venceEn.getTime() + Compra.MARGEN_PAGO_EN_CAMINO_MS
    );
  }

  // Lo dispara el sistema: cancela la reserva sin pagar y libera el cupo. Devuelve si venció.
  vencer(reloj) {
    if (!this.correspondeVencer(reloj)) return false;
    this.#estado.cancelar(this, null, reloj);
    this.canceladaPorVencimiento = true;
    return true;
  }

  pagar(quien, reloj) {
    this.verificarPago(quien, reloj);
    this.#estado.pagar(this, quien, reloj);
  }

  cancelar(quien, reloj) {
    this.#exigirComprador(quien);
    this.#exigirEventoPendiente(reloj);
    if (this.pagoEnProceso) throw new PagoEnProcesoError();
    this.#estado.cancelar(this, quien, reloj);
  }

  marcarUtilizada(quien, reloj) {
    if (!this.esOrganizador(quien)) {
      throw new ProhibidoError("Solo el organizador del evento puede validar entradas");
    }
    if (this.evento.estaCancelado()) throw new EventoCanceladoError();
    this.#estado.marcarUtilizada(this, quien, reloj);
  }

  // Lo dispara la cancelación del evento (el organizador o, si quedó pendiente, el sistema). A diferencia de
  // cancelar, no mira la fecha y alcanza también a las UTILIZADAS: el evento no se va a hacer. Con un pago en
  // proceso se espera el resultado del cobro.
  cancelarPorEvento(quien, reloj) {
    if (this.pagoEnProceso) throw new PagoEnProcesoError();
    this.#estado.cancelarPorEvento(this, quien, reloj);
  }

  // Lo que el barrido de eventos cancelados todavía tiene que resolver: cancelarla o devolverle el dinero.
  pendienteDeCancelacionPorEvento() {
    return this.evento.estaCancelado() && (this.vigente || this.requiereReembolso());
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
    const eventoPendiente = !this.evento.estaCancelado() && !this.evento.yaSeRealizo(reloj);
    return {
      pagar:
        esComprador &&
        eventoPendiente &&
        !this.pagoEnProceso &&
        !this.plazoDePagoCumplido(reloj) &&
        this.#estado.permite("pagar"),
      cancelar: esComprador && eventoPendiente && !this.pagoEnProceso && this.#estado.permite("cancelar"),
      validar:
        this.esOrganizador(usuario) &&
        !this.evento.estaCancelado() &&
        this.#estado.permite("marcarUtilizada"),
      reseniar: esComprador && !this.resenia && this.#estado.permite("reseniar"),
      chatear: this.puedeVer(usuario),
      // Si la pasarela falló al devolver la plata, el comprador lo reintenta aunque el evento ya haya pasado.
      reintentarReembolso: esComprador && this.requiereReembolso(),
    };
  }

  #exigirComprador(usuario) {
    if (!this.esComprador(usuario)) {
      throw new ProhibidoError("Solo quien hizo la compra puede realizar esta acción");
    }
  }

  #exigirEventoPendiente(reloj) {
    if (this.evento.estaCancelado()) {
      throw new EventoCanceladoError();
    }
    if (this.evento.yaSeRealizo(reloj)) {
      throw new EventoFinalizadoError();
    }
  }
}
