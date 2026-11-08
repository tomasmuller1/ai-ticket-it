import { randomUUID } from "node:crypto";

import { Compra } from "../domain/Compra.js";
import { EstadoCompra } from "../domain/estados/EstadoCompra.js";
import {
  AppError,
  NoEncontradoError,
  PasarelaNoDisponibleError,
  ProhibidoError,
  ReglaNegocioError,
} from "../errors/index.js";

// Una compra ocupada en otra operación (un pago, una cancelación) se deja para el próximo barrido sin loguear:
// no es un error.
const OCUPADA = ["OPERACION_EN_CURSO", "PAGO_EN_PROCESO"];

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
    plazoReservaMinutos,
    notificaciones,
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
    // Los avisos van siempre después de guardar y nunca lanzan: no pueden romper la operación.
    this.notificaciones = notificaciones;
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
    await this.compras.guardar(compra);
    // Al organizador no se le avisa cada compra: solo si con esta se agotó el tipo de entrada.
    if (compra.tipoEntrada.disponibles() === 0) {
      await this.notificaciones.avisarAgotado(evento, compra.tipoEntrada);
    }
    return compra;
  }

  // Barrido periódico: cancela las reservas sin pagar cuyo plazo se cumplió y libera su cupo. Si hay otra
  // operación en curso sobre la compra, la saltea hasta el próximo barrido. Devuelve cuántas venció.
  async vencerReservas() {
    let vencidas = 0;
    await this.#porCadaCompra(
      await this.compras.buscarPorVencer(this.reloj),
      async (compra) => {
        if (!compra.vencer(this.reloj)) return;
        await this.compras.guardar(compra);
        vencidas += 1;
        await this.notificaciones.avisarReservaVencida(compra);
      },
      "No se pudo vencer la reserva",
    );
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

  // Si el cobro falla, la compra queda como estaba (PENDIENTE) y la operación explica el motivo. En los dos
  // casos se le avisa al comprador: el resultado llega cuando ya no está mirando la pantalla del pago.
  async #procesarCobro(compra, tarjeta) {
    let cobrado = false;
    let transaccionId;
    try {
      ({ transaccionId } = await this.#conPasarela(() =>
        this.pasarelaPagos.cobrar({ referencia: compra.id, monto: compra.total, token: tarjeta.token }),
      ));
      cobrado = true;
    } catch (error) {
      // Solo lo que dice la pasarela (un rechazo, o que no responde) rechaza el pago.
      compra.rechazarPago({ codigo: error.codigo, mensaje: error.message }, this.reloj);
    }
    if (cobrado) {
      try {
        compra.confirmarPago(transaccionId, this.reloj);
      } catch (err) {
        // La tarjeta ya se cobró: informar un rechazo sería falso. Queda la transacción en el log para
        // conciliarla y la operación sin resolver.
        this.logger?.error(
          { err, compraId: compra.id, transaccionId },
          "La pasarela cobró pero no se pudo confirmar la compra",
        );
        return;
      }
    }
    await this.operacionesPago.guardar(compra.operacionPago);
    await this.compras.guardar(compra);
    // El evento se canceló mientras se cobraba: no se avisa el resultado del pago (llegó "Se canceló") y la
    // compra se cancela y, si se cobró, se reembolsa.
    if (compra.evento.estaCancelado()) {
      await this.#resolverPorCancelacion([compra], null);
      return;
    }
    if (cobrado) {
      await this.notificaciones.avisarPagoConfirmado(compra);
    } else {
      await this.notificaciones.avisarPagoRechazado(compra);
    }
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
      // Una compra sin pagar se cancela sin aviso: no se movió dinero y lo hizo la misma persona.
      if (compra.requiereReembolso()) await this.#reembolsar(compra);
      return compra;
    });
  }

  // La pasarela devuelve el dinero, la compra queda REEMBOLSADA y se le avisa al comprador. Si la pasarela
  // falla, lanza PASARELA_NO_DISPONIBLE y la compra queda como estaba (CANCELADA, a la espera del reembolso).
  async #reembolsar(compra) {
    await this.#conPasarela(() =>
      this.pasarelaPagos.reembolsar({ referencia: compra.id, monto: compra.total }),
    );
    compra.reembolsar(this.reloj);
    await this.compras.guardar(compra);
    await this.notificaciones.avisarReembolso(compra);
  }

  // El organizador canceló el evento: se cancelan sus compras vigentes (incluso las UTILIZADAS) y se reembolsan
  // las pagadas. Las que no se pueden resolver ahora (pasarela caída, pago en proceso) quedan para el barrido.
  async resolverCancelacionDeEvento(eventoId, quien) {
    const compras = await this.compras.buscarPorEvento(eventoId);
    return this.#resolverPorCancelacion(
      compras.filter((compra) => compra.pendienteDeCancelacionPorEvento()),
      quien,
    );
  }

  // Barrido periódico: termina lo que quedó pendiente de los eventos cancelados. Lo hace el sistema.
  async resolverEventosCancelados() {
    return this.#resolverPorCancelacion(await this.compras.buscarPendientesPorEventoCancelado(), null);
  }

  // Por cada compra: la cancela por evento si sigue vigente y, si estaba pagada, la reembolsa. Devuelve
  // cuántas quedaron resueltas y cuántas siguen pendientes (para el próximo barrido).
  #resolverPorCancelacion(compras, quien) {
    return this.#porCadaCompra(
      compras,
      async (compra) => {
        if (compra.vigente) {
          compra.cancelarPorEvento(quien, this.reloj);
          await this.compras.guardar(compra);
        }
        if (compra.requiereReembolso()) await this.#reembolsar(compra);
      },
      "No se pudo resolver la compra de un evento cancelado",
    );
  }

  // El organizador pospuso el evento: las entradas ya validadas vuelven a CONFIRMADA, porque el evento no se
  // hizo y tienen que valer (y poder cancelarse y volver a validarse) para la nueva fecha.
  async reabrirEntradasPorPostergacion(eventoId, quien) {
    const utilizadas = (await this.compras.buscarPorEvento(eventoId)).filter(
      (compra) => compra.estado === EstadoCompra.UTILIZADA,
    );
    return this.#porCadaCompra(
      utilizadas,
      async (compra) => {
        if (compra.estado !== EstadoCompra.UTILIZADA) return;
        compra.reabrirPorPostergacion(quien, this.reloj);
        await this.compras.guardar(compra);
      },
      "No se pudo reabrir la entrada del evento pospuesto",
    );
  }

  // Corre `operacion` sobre cada compra, de a una, con el candado y releyéndola adentro: una con problemas no
  // frena a las demás. Las ocupadas en otra operación (OPERACION_EN_CURSO, PAGO_EN_PROCESO) se saltean sin
  // loguear, porque no es un error: en los barridos, las retoma el próximo. Cualquier otra falla se loguea.
  // Devuelve cuántas salieron bien y cuántas quedaron pendientes.
  async #porCadaCompra(compras, operacion, mensajeDeError) {
    let resueltas = 0;
    let pendientes = 0;
    for (const { id } of compras) {
      try {
        await this.#sinOperacionesSimultaneas(id, async () => operacion(await this.compras.buscarPorId(id)));
        resueltas += 1;
      } catch (err) {
        pendientes += 1;
        if (!OCUPADA.includes(err.codigo)) this.logger?.error({ err, compraId: id }, mensajeDeError);
      }
    }
    return { resueltas, pendientes };
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
    await this.compras.guardar(compra);
    await this.notificaciones.avisarEntradaUtilizada(compra);
    return compra;
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
    await this.notificaciones.avisarMensajeNuevo(compra, mensaje);
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
