import { TipoNotificacion } from "../domain/Notificacion.js";
import { RepositorioEnMemoria } from "./RepositorioEnMemoria.js";

export class UsuariosRepository extends RepositorioEnMemoria {
  async buscarPorEmail(email) {
    const [usuario] = await this.buscarDonde((u) => u.email.toLowerCase() === email.toLowerCase());
    return usuario ?? null;
  }

  async buscarPorGoogleId(googleId) {
    const [usuario] = await this.buscarDonde((u) => u.googleId === googleId);
    return usuario ?? null;
  }
}

export class CategoriasRepository extends RepositorioEnMemoria {}

export class EventosRepository extends RepositorioEnMemoria {
  buscarPorOrganizador(organizadorId) {
    return this.buscarDonde((evento) => evento.organizador.id === organizadorId);
  }
}

export class ComprasRepository extends RepositorioEnMemoria {
  buscarPorComprador(compradorId) {
    return this.buscarDonde((compra) => compra.comprador.id === compradorId);
  }

  buscarPorEvento(eventoId) {
    return this.buscarDonde((compra) => compra.evento.id === eventoId);
  }

  buscarPorVencer(reloj) {
    return this.buscarDonde((compra) => compra.correspondeVencer(reloj));
  }
}

export class ReseniasRepository extends RepositorioEnMemoria {
  buscarPorEvento(eventoId) {
    return this.buscarDonde((resenia) => resenia.evento.id === eventoId);
  }

  buscarPorOrganizador(organizadorId) {
    return this.buscarDonde((resenia) => resenia.evento.organizador.id === organizadorId);
  }
}

export class OperacionesPagoRepository extends RepositorioEnMemoria {}

export class ClavesIdempotenciaRepository extends RepositorioEnMemoria {}

export class TarjetasRepository extends RepositorioEnMemoria {
  buscarPorUsuario(usuarioId) {
    return this.buscarDonde((tarjeta) => tarjeta.usuarioId === usuarioId);
  }
}

const AVISOS_DE_AGOTADO = [TipoNotificacion.ENTRADAS_AGOTADAS, TipoNotificacion.EVENTO_AGOTADO];

export class NotificacionesRepository extends RepositorioEnMemoria {
  buscarPorDestinatario(usuarioId) {
    return this.buscarDonde((notificacion) => notificacion.destinatario.id === usuarioId);
  }

  // La notificación de mensajes de una compra que el destinatario todavía no leyó (hay a lo sumo una).
  async buscarMensajeSinLeer(destinatarioId, compraId) {
    const [notificacion] = await this.buscarDonde(
      (n) =>
        n.tipo === TipoNotificacion.MENSAJE_NUEVO &&
        !n.leida &&
        n.destinatario.id === destinatarioId &&
        n.compra?.id === compraId,
    );
    return notificacion ?? null;
  }

  // Sin tipo de entrada: si ya se avisó que el evento está agotado. Con tipo: si ya se avisó que se agotó ese
  // tipo, sea con su propio aviso o con el del evento, cuando fue el último en agotarse.
  async existeAvisoDeAgotado(eventoId, tipoEntradaId = null) {
    const avisos = await this.buscarDonde(
      (n) =>
        n.evento.id === eventoId &&
        (tipoEntradaId === null
          ? n.tipo === TipoNotificacion.EVENTO_AGOTADO
          : AVISOS_DE_AGOTADO.includes(n.tipo) && n.tipoEntrada?.id === tipoEntradaId),
    );
    return avisos.length > 0;
  }
}

export class RefreshTokensRepository extends RepositorioEnMemoria {
  async buscarPorHash(hash) {
    const [token] = await this.buscarDonde((t) => t.hash === hash);
    return token ?? null;
  }

  buscarPorFamilia(familia) {
    return this.buscarDonde((t) => t.familia === familia);
  }

  buscarPorUsuario(usuarioId) {
    return this.buscarDonde((t) => t.usuarioId === usuarioId);
  }
}

export function crearRepositorios() {
  return {
    usuarios: new UsuariosRepository(),
    categorias: new CategoriasRepository(),
    eventos: new EventosRepository(),
    compras: new ComprasRepository(),
    resenias: new ReseniasRepository(),
    tarjetas: new TarjetasRepository(),
    operacionesPago: new OperacionesPagoRepository(),
    clavesIdempotencia: new ClavesIdempotenciaRepository(),
    refreshTokens: new RefreshTokensRepository(),
    notificaciones: new NotificacionesRepository(),
  };
}
