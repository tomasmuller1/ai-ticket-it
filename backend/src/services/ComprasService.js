import { randomUUID } from "node:crypto";

import { Compra } from "../domain/Compra.js";
import { NoEncontradoError, ProhibidoError } from "../errors/index.js";

export class ComprasService {
  constructor({ compras, eventos, resenias }, pasarelaPagos, reloj) {
    this.compras = compras;
    this.eventos = eventos;
    this.resenias = resenias;
    this.pasarelaPagos = pasarelaPagos;
    this.reloj = reloj;
  }

  // CU12: crea la compra PENDIENTE y reserva el cupo.
  async comprar({ eventoId, tipoEntradaId, cantidad }, comprador) {
    const evento = await this.eventos.buscarPorId(eventoId);
    if (!evento) {
      throw new NoEncontradoError(`No existe el evento ${eventoId}`);
    }
    const compra = Compra.crear({
      id: randomUUID(),
      comprador,
      evento,
      tipoEntradaId,
      cantidad,
      reloj: this.reloj,
    });
    return this.compras.guardar(compra);
  }

  // CU1: las compras del usuario, la más reciente primero.
  async misCompras(usuario, { estado }) {
    const compras = await this.compras.buscarPorComprador(usuario.id);
    return compras
      .filter((compra) => !estado || compra.estado === estado)
      .sort((a, b) => b.fechaCreacion - a.fechaCreacion);
  }

  async obtener(id, usuario) {
    const compra = await this.compras.buscarPorId(id);
    if (!compra) {
      throw new NoEncontradoError(`No existe la compra ${id}`);
    }
    if (!compra.puedeVer(usuario)) {
      throw new ProhibidoError("No tenés acceso a esta compra");
    }
    return compra;
  }

  // Primero se verifica que se pueda pagar, después se cobra y recién ahí cambia el estado.
  async pagar(id, usuario) {
    const compra = await this.obtener(id, usuario);
    compra.verificarPago(usuario, this.reloj);
    const { transaccionId } = await this.pasarelaPagos.cobrar({ referencia: compra.id, monto: compra.total });
    compra.pagar(usuario, this.reloj);
    compra.transaccionPago = transaccionId;
    return this.compras.guardar(compra);
  }

  // CU7 y CU8: si la compra estaba pagada, se pide el reembolso y queda REEMBOLSADA.
  async cancelar(id, usuario) {
    const compra = await this.obtener(id, usuario);
    compra.cancelar(usuario, this.reloj);
    if (compra.requiereReembolso()) {
      await this.pasarelaPagos.reembolsar({ referencia: compra.id, monto: compra.total });
      compra.reembolsar(this.reloj);
    }
    return this.compras.guardar(compra);
  }

  // El organizador valida la entrada en el ingreso al evento.
  async validarEntrada(id, usuario) {
    const compra = await this.obtener(id, usuario);
    compra.marcarUtilizada(usuario, this.reloj);
    return this.compras.guardar(compra);
  }

  // CU2: compras de un evento y cuántas entradas quedan de cada tipo. Solo para su organizador.
  async comprasDeEvento(eventoId, usuario, { estado }) {
    const evento = await this.eventos.buscarPorId(eventoId);
    if (!evento) {
      throw new NoEncontradoError(`No existe el evento ${eventoId}`);
    }
    if (!evento.esOrganizadoPor(usuario)) {
      throw new ProhibidoError("Solo el organizador puede ver las compras de este evento");
    }
    const compras = (await this.compras.buscarPorEvento(eventoId))
      .filter((compra) => !estado || compra.estado === estado)
      .sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    return { evento, compras };
  }

  // CU5 y CU6. Con "desde" se devuelven solo los mensajes nuevos (para el polling de la app).
  async mensajes(id, usuario, { desde }) {
    const compra = await this.obtener(id, usuario);
    return compra.mensajes.filter((mensaje) => !desde || mensaje.enviado > desde);
  }

  async enviarMensaje(id, usuario, texto) {
    const compra = await this.obtener(id, usuario);
    const mensaje = compra.enviarMensaje(texto, usuario, this.reloj);
    await this.compras.guardar(compra);
    return mensaje;
  }

  // CU9: reseña del comprador sobre un evento al que asistió.
  async reseniar(id, usuario, { puntuacion, detalle }) {
    const compra = await this.obtener(id, usuario);
    const resenia = compra.reseniar({ id: randomUUID(), puntuacion, detalle }, usuario, this.reloj);
    await this.resenias.guardar(resenia);
    await this.compras.guardar(compra);
    return resenia;
  }
}
