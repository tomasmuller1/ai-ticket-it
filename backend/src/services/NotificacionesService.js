import { randomUUID } from "node:crypto";

import { Notificacion, TipoNotificacion } from "../domain/Notificacion.js";
import { NoEncontradoError } from "../errors/index.js";
import { formatearMonto } from "../utils/formato.js";
import { paginar } from "../utils/paginar.js";

const LARGO_MAXIMO_CUERPO = 120;

function entradas(cantidad) {
  return cantidad === 1 ? "entrada" : "entradas";
}

// Por caracteres y no por unidades de UTF-16: así no se parte un emoji.
function recortar(texto, largo = LARGO_MAXIMO_CUERPO) {
  const caracteres = [...texto];
  if (caracteres.length <= largo) return texto;
  const recortado = caracteres
    .slice(0, largo - 1)
    .join("")
    .trimEnd();
  return `${recortado}…`;
}

function tituloDeMensajes(autor, evento, cantidad) {
  return cantidad > 1
    ? `${autor.nombre} te escribió ${cantidad} mensajes por ${evento.nombre}`
    : `${autor.nombre} te escribió por ${evento.nombre}`;
}

// Notificaciones in-app. Los textos se arman acá, en el momento del aviso, y se guardan hechos.
// Los `avisar*` los llaman otros services después de guardar su operación, y nunca lanzan: un aviso que falla
// se loguea y la operación que lo disparó (un pago, una cancelación, un mensaje) sigue su curso.
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
    return this.#avisarAlComprador(
      compra,
      TipoNotificacion.PAGO_CONFIRMADO,
      ({ cantidad, tipoEntrada, evento }) => ({
        titulo: "Pago aprobado",
        cuerpo: `Ya tenés ${cantidad} ${entradas(cantidad)} ${tipoEntrada.nombre} para ${evento.nombre}.`,
      }),
    );
  }

  avisarPagoRechazado(compra) {
    return this.#avisarAlComprador(compra, TipoNotificacion.PAGO_RECHAZADO, ({ evento }) => ({
      titulo: "No pudimos cobrar tu compra",
      cuerpo: `Se rechazó el pago de tus entradas para ${evento.nombre}. Podés reintentarlo desde la compra.`,
    }));
  }

  avisarReservaVencida(compra) {
    return this.#avisarAlComprador(compra, TipoNotificacion.RESERVA_VENCIDA, ({ evento }) => ({
      titulo: "Venció tu reserva",
      cuerpo: `Pasó el plazo para pagar tus entradas de ${evento.nombre} y las liberamos.`,
    }));
  }

  avisarReembolso(compra) {
    return this.#avisarAlComprador(compra, TipoNotificacion.REEMBOLSO_REALIZADO, ({ total, evento }) => ({
      titulo: "Te devolvimos el dinero",
      cuerpo: `Reintegramos ${formatearMonto(total)} de tu compra para ${evento.nombre}.`,
    }));
  }

  avisarEntradaUtilizada(compra) {
    return this.#avisarAlComprador(compra, TipoNotificacion.ENTRADA_UTILIZADA, ({ evento }) => ({
      titulo: "¡Que lo disfrutes!",
      cuerpo: `Validaron tu entrada para ${evento.nombre}. Después contanos qué te pareció.`,
    }));
  }

  // Le avisa a la otra parte del chat. Mientras no la lea, los mensajes de esa compra se juntan en una sola
  // notificación que los cuenta y muestra el último.
  avisarMensajeNuevo(compra, mensaje) {
    const tipo = TipoNotificacion.MENSAJE_NUEVO;
    return this.#avisar({ tipo, compraId: compra?.id }, () => {
      const { evento } = compra;
      const autor = mensaje.usuario;
      const destinatario = compra.esComprador(autor) ? evento.organizador : compra.comprador;
      const cuerpo = recortar(mensaje.mensaje);
      return this.#deAUno(`mensajes:${destinatario.id}:${compra.id}`, async () => {
        const sinLeer = await this.notificaciones.buscarMensajeSinLeer(destinatario.id, compra.id);
        if (sinLeer) {
          const titulo = tituloDeMensajes(autor, evento, sinLeer.cantidad + 1);
          sinLeer.sumarMensaje({ titulo, cuerpo }, this.reloj);
          await this.notificaciones.guardar(sinLeer);
        } else {
          const titulo = tituloDeMensajes(autor, evento, 1);
          await this.#guardarNueva({ destinatario, tipo, titulo, cuerpo, evento, compra });
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
            titulo: `${evento.nombre} está agotado`,
            cuerpo: "No quedan entradas de ningún tipo.",
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
          titulo: `Se agotaron las entradas ${tipoEntrada.nombre}`,
          cuerpo: `Ya no quedan entradas ${tipoEntrada.nombre} para ${evento.nombre}.`,
          evento,
          tipoEntrada,
        });
      }),
    );
  }

  // `textos` recibe la compra y devuelve { titulo, cuerpo }. Se arma dentro del aviso para que ni un error al
  // armar el texto se escape.
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
