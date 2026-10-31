import { randomUUID } from "node:crypto";

import { Compra } from "../domain/Compra.js";
import { NoEncontradoError, ProhibidoError, ReglaNegocioError } from "../errors/index.js";

export class ComprasService {
  // Ids de compras con un cobro o reembolso en curso: evita cobrar dos veces si llegan dos requests juntas.
  #enCurso = new Set();

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
  pagar(id, usuario) {
    return this.#sinOperacionesSimultaneas(id, async () => {
      const compra = await this.obtener(id, usuario);
      compra.verificarPago(usuario, this.reloj);
      const { transaccionId } = await this.pasarelaPagos.cobrar({
        referencia: compra.id,
        monto: compra.total,
      });
      compra.pagar(usuario, this.reloj);
      compra.transaccionPago = transaccionId;
      return this.compras.guardar(compra);
    });
  }

  // CU7 y CU8: si la compra estaba pagada, se pide el reembolso y queda REEMBOLSADA.
  // Si la pasarela falla, la compra queda CANCELADA y pendiente de reembolso: volver a cancelarla
  // reintenta solo el reembolso.
  cancelar(id, usuario) {
    return this.#sinOperacionesSimultaneas(id, async () => {
      const compra = await this.obtener(id, usuario);
      if (compra.requiereReembolso()) {
        if (!compra.esComprador(usuario)) {
          throw new ProhibidoError("Solo quien hizo la compra puede realizar esta acción");
        }
      } else {
        compra.cancelar(usuario, this.reloj);
        await this.compras.guardar(compra);
      }
      if (compra.requiereReembolso()) {
        await this.pasarelaPagos.reembolsar({ referencia: compra.id, monto: compra.total });
        compra.reembolsar(this.reloj);
      }
      return this.compras.guardar(compra);
    });
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
    // ">=" para no perder mensajes enviados en el mismo milisegundo; la app descarta los repetidos por id.
    return compra.mensajes.filter((mensaje) => !desde || mensaje.enviado >= desde);
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

  async #sinOperacionesSimultaneas(id, operacion) {
    if (this.#enCurso.has(id)) {
      throw new ReglaNegocioError("Ya hay una operación en curso para esta compra", "OPERACION_EN_CURSO");
    }
    this.#enCurso.add(id);
    try {
      return await operacion();
    } finally {
      this.#enCurso.delete(id);
    }
  }
}
