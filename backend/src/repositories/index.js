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
}

export class ReseniasRepository extends RepositorioEnMemoria {
  buscarPorEvento(eventoId) {
    return this.buscarDonde((resenia) => resenia.evento.id === eventoId);
  }

  buscarPorOrganizador(organizadorId) {
    return this.buscarDonde((resenia) => resenia.evento.organizador.id === organizadorId);
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
    refreshTokens: new RefreshTokensRepository(),
  };
}
