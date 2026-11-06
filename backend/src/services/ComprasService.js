import { randomUUID } from "node:crypto";

import { Compra } from "../domain/Compra.js";
import {
  AppError,
  NoEncontradoError,
  PasarelaNoDisponibleError,
  ProhibidoError,
  ReglaNegocioError,
} from "../errors/index.js";

export class ComprasService {
  // Ids de compras con un pedido de cobro o de reembolso en curso: evita operar dos veces si llegan dos
  // requests juntas.
  #enCurso = new Set();

  constructor(
    { compras, eventos, resenias, operacionesPago },
    pasarelaPagos,
    reloj,
    tarjetasService,
    logger,
    plazoReservaMinutos = 15,
  ) {
    this.compras = compras;
    this.operacionesPago = operacionesPago;
    this.logger = logger;
    this.eventos = eventos;
    this.resenias = resenias;
    this.pasarelaPagos = pasarelaPagos;
    this.tarjetasService = tarjetasService;
    this.reloj = reloj;
    this.plazoReservaMinutos = plazoReservaMinutos;
  }

  // CU12: crea la compra PENDIENTE y reserva el cupo.
  async comprar({ eventoId, tipoEntradaId, cantidad }, comprador) {
    const evento = await this.eventos.buscarPorId(eventoId);
    if (!evento) {
      throw new NoEncontradoError(`No existe el evento ${eventoId}`);
    }
    const venceEn = new Date(this.reloj.ahora().getTime() + this.plazoReservaMinutos * 60 * 1000);
    const compra = Compra.crear({
      id: randomUUID(),
      comprador,
      evento,
      tipoEntradaId,
      cantidad,
      reloj: this.reloj,
      venceEn,
    });
    return this.compras.guardar(compra);
  }

  // Barrido periódico: cancela las reservas sin pagar cuyo plazo se cumplió y libera su cupo. Si hay otra
  // operación en curso sobre la compra, la saltea hasta el próximo barrido. Devuelve cuántas venció.
  async vencerReservas() {
    let vencidas = 0;
    for (const { id } of await this.compras.buscarVencidas(this.reloj)) {
      try {
        await this.#sinOperacionesSimultaneas(id, async () => {
          const compra = await this.compras.buscarPorId(id);
          if (compra?.vencer(this.reloj)) {
            await this.compras.guardar(compra);
            vencidas += 1;
          }
        });
      } catch (error) {
        if (error.codigo !== "OPERACION_EN_CURSO") throw error;
      }
    }
    return vencidas;
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

  // Se verifica que se pueda pagar y que la tarjeta sea del comprador, se registra la operación y se responde
  // enseguida: el cobro se resuelve en segundo plano y la app consulta el resultado con polling.
  iniciarPago(id, usuario, tarjetaId) {
    return this.#sinOperacionesSimultaneas(id, async () => {
      const compra = await this.obtener(id, usuario);
      compra.verificarPago(usuario, this.reloj);
      const tarjeta = await this.tarjetasService.obtener(usuario, tarjetaId);
      const operacion = compra.iniciarPago({ id: randomUUID(), tarjetaId }, usuario, this.reloj);
      await this.operacionesPago.guardar(operacion);
      await this.compras.guardar(compra);
      this.#procesarCobro(compra, tarjeta).catch((err) =>
        this.logger?.error({ err, operacionId: operacion.id }, "No se pudo guardar el resultado del cobro"),
      );
      return operacion;
    });
  }

  // Si el cobro falla, la compra queda como estaba (PENDIENTE) y la operación explica el motivo.
  async #procesarCobro(compra, tarjeta) {
    try {
      const { transaccionId } = await this.#conPasarela(() =>
        this.pasarelaPagos.cobrar({ referencia: compra.id, monto: compra.total, token: tarjeta.token }),
      );
      compra.confirmarPago(transaccionId, this.reloj);
    } catch (error) {
      compra.rechazarPago({ codigo: error.codigo, mensaje: error.message }, this.reloj);
    }
    await this.operacionesPago.guardar(compra.operacionPago);
    await this.compras.guardar(compra);
  }

  // Lo consulta la app mientras espera el resultado. Es información de pago: solo la ve el comprador.
  async operacionPago(id, usuario, operacionId) {
    const compra = await this.obtener(id, usuario);
    if (!compra.esComprador(usuario)) {
      throw new ProhibidoError("Solo quien hizo la compra puede ver sus pagos");
    }
    const operacion = await this.operacionesPago.buscarPorId(operacionId);
    if (operacion?.compraId !== compra.id) {
      throw new NoEncontradoError("No encontramos ese pago");
    }
    return operacion;
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
        await this.#conPasarela(() =>
          this.pasarelaPagos.reembolsar({ referencia: compra.id, monto: compra.total }),
        );
        compra.reembolsar(this.reloj);
      }
      return this.compras.guardar(compra);
    });
  }

  // La pasarela es un servicio externo: una falla inesperada suya se informa como "no disponible" (y el
  // resto de la app sigue funcionando), sin mostrar el detalle. Lo que ella decide, como un rechazo, pasa.
  async #conPasarela(operacion) {
    try {
      return await operacion();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new PasarelaNoDisponibleError();
    }
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
