import { randomUUID } from "node:crypto";

import { Notificacion, TipoNotificacion } from "../domain/Notificacion.js";
import {
  textoEntradasAgotadas,
  textoEntradaUtilizada,
  textoEventoAgotado,
  textoMensajeNuevo,
  textoPagoConfirmado,
  textoPagoRechazado,
  textoReembolso,
  textoReservaVencida,
} from "../domain/textosNotificacion.js";
import { NoEncontradoError } from "../errors/index.js";
import { paginar } from "../utils/paginar.js";

// Notificaciones in-app. Los textos salen de domain/textosNotificacion.js, se arman en el momento del aviso y
// se guardan hechos. Los `avisar*` los llaman otros services después de guardar su operación, y nunca lanzan:
// un aviso que falla se loguea y la operación que lo disparó (un pago, una cancelación, un mensaje) sigue.
export class NotificacionesService {
  // Avisos que leen y después escriben la misma notificación (el chat de una compra, los agotados de un
  // evento) van de a uno por clave: si dos llegan juntos, el segundo ve lo que guardó el primero.
  #colas = new Map();

  constructor({ notificaciones }, reloj, logger) {
    this.notificaciones = notificaciones;
    this.reloj = reloj;
    this.logger = logger;
  }

  async listar(usuario, { soloNoLeidas = false, page = 1, pageSize = 20 } = {}) {
    const propias = await this.notificaciones.buscarPorDestinatario(usuario.id);
    // La más reciente primero; con la misma fecha, la que se creó después (por eso el reverse antes del sort,
    // que es estable).
    const ordenadas = propias
      .filter((notificacion) => !soloNoLeidas || !notificacion.leida)
      .reverse()
      .sort((a, b) => b.fechaHora - a.fechaHora);
    return paginar(ordenadas, { page, pageSize });
  }

  async contarNoLeidas(usuario) {
    const propias = await this.notificaciones.buscarPorDestinatario(usuario.id);
    return propias.filter((notificacion) => !notificacion.leida).length;
  }

  // La de otra persona responde igual que una que no existe: no se confirma que exista.
  async marcarLeida(id, usuario) {
    const notificacion = await this.notificaciones.buscarPorId(id);
    if (!notificacion?.esDe(usuario)) {
      throw new NoEncontradoError("No encontramos esa notificación");
    }
    notificacion.marcarLeida();
    return this.notificaciones.guardar(notificacion);
  }

  // Todas las no leídas del usuario o, con `compraId`, solo las de esa compra (al abrir su chat). Devuelve
  // cuántas marcó.
  async marcarLeidas(usuario, { compraId } = {}) {
    const propias = await this.notificaciones.buscarPorDestinatario(usuario.id);
    const sinLeer = propias.filter((n) => !n.leida && (!compraId || n.compra?.id === compraId));
    for (const notificacion of sinLeer) {
      notificacion.marcarLeida();
      await this.notificaciones.guardar(notificacion);
    }
    return sinLeer.length;
  }

  avisarPagoConfirmado(compra) {
    return this.#avisarAlComprador(compra, TipoNotificacion.PAGO_CONFIRMADO, textoPagoConfirmado);
  }

  // Con la pasarela caída el texto no dice que se rechazó: lo decide textoPagoRechazado según el motivo.
  avisarPagoRechazado(compra) {
    return this.#avisarAlComprador(compra, TipoNotificacion.PAGO_RECHAZADO, textoPagoRechazado);
  }

  avisarReservaVencida(compra) {
    return this.#avisarAlComprador(compra, TipoNotificacion.RESERVA_VENCIDA, textoReservaVencida);
  }

  avisarReembolso(compra) {
    return this.#avisarAlComprador(compra, TipoNotificacion.REEMBOLSO_REALIZADO, textoReembolso);
  }

  avisarEntradaUtilizada(compra) {
    return this.#avisarAlComprador(compra, TipoNotificacion.ENTRADA_UTILIZADA, textoEntradaUtilizada);
  }

  // Le avisa a la otra parte del chat. Mientras no la lea, los mensajes de esa compra se juntan en una sola
  // notificación que los cuenta y muestra el último.
  avisarMensajeNuevo(compra, mensaje) {
    const tipo = TipoNotificacion.MENSAJE_NUEVO;
    return this.#avisar({ tipo, compraId: compra?.id }, () => {
      const { evento } = compra;
      const destinatario = compra.esComprador(mensaje.usuario) ? evento.organizador : compra.comprador;
      return this.#deAUno(`mensajes:${destinatario.id}:${compra.id}`, async () => {
        const sinLeer = await this.notificaciones.buscarMensajeSinLeer(destinatario.id, compra.id);
        if (sinLeer) {
          sinLeer.sumarMensaje(textoMensajeNuevo(compra, mensaje, sinLeer.cantidad + 1), this.reloj);
          await this.notificaciones.guardar(sinLeer);
        } else {
          const textos = textoMensajeNuevo(compra, mensaje);
          await this.#guardarNueva({ destinatario, tipo, ...textos, evento, compra });
        }
      });
    });
  }

  // Al organizador no se le avisa cada compra: solo cuando un tipo de entrada se queda sin disponibles, o que
  // el evento está agotado si era el último. Una sola vez por tipo y por evento, aunque se libere y se vuelva
  // a agotar.
  avisarAgotado(evento, tipoEntrada) {
    const contexto = { eventoId: evento?.id, tipoEntradaId: tipoEntrada?.id };
    return this.#avisar(contexto, () =>
      this.#deAUno(`agotado:${evento.id}`, async () => {
        const destinatario = evento.organizador;
        if (evento.agotado()) {
          if (await this.notificaciones.existeAvisoDeAgotado(evento.id)) return;
          await this.#guardarNueva({
            destinatario,
            tipo: TipoNotificacion.EVENTO_AGOTADO,
            ...textoEventoAgotado(evento),
            evento,
            tipoEntrada,
          });
          return;
        }
        if (tipoEntrada.disponibles() > 0) return;
        if (await this.notificaciones.existeAvisoDeAgotado(evento.id, tipoEntrada.id)) return;
        await this.#guardarNueva({
          destinatario,
          tipo: TipoNotificacion.ENTRADAS_AGOTADAS,
          ...textoEntradasAgotadas(evento, tipoEntrada),
          evento,
          tipoEntrada,
        });
      }),
    );
  }

  // `textos` es una de las funciones de domain/textosNotificacion.js: recibe la compra y devuelve
  // { titulo, cuerpo }. Se llama dentro del aviso para que ni un error al armar el texto se escape.
  #avisarAlComprador(compra, tipo, textos) {
    return this.#avisar({ tipo, compraId: compra?.id }, () =>
      this.#guardarNueva({
        destinatario: compra.comprador,
        tipo,
        evento: compra.evento,
        compra,
        ...textos(compra),
      }),
    );
  }

  async #avisar(contexto, aviso) {
    try {
      await aviso();
    } catch (err) {
      this.logger?.error({ err, ...contexto }, "No se pudo guardar la notificación");
    }
  }

  #guardarNueva({ destinatario, tipo, titulo, cuerpo, evento, compra = null, tipoEntrada = null }) {
    return this.notificaciones.guardar(
      new Notificacion({
        id: randomUUID(),
        destinatario,
        tipo,
        titulo,
        cuerpo,
        evento,
        compra,
        tipoEntrada,
        fechaHora: this.reloj.ahora(),
      }),
    );
  }

  // Corre las operaciones con la misma clave de a una, en el orden en que llegan. Si una falla, la siguiente
  // corre igual.
  async #deAUno(clave, operacion) {
    const anterior = this.#colas.get(clave) ?? Promise.resolve();
    const actual = anterior.then(operacion);
    const cola = actual.catch(() => {});
    this.#colas.set(clave, cola);
    try {
      return await actual;
    } finally {
      if (this.#colas.get(clave) === cola) this.#colas.delete(clave);
    }
  }
}
