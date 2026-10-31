import { NoEncontradoError } from "../errors/index.js";

export class UsuariosService {
  constructor({ usuarios, eventos }) {
    this.usuarios = usuarios;
    this.eventos = eventos;
  }

  async agregarFavorito(usuario, eventoId) {
    const evento = await this.eventos.buscarPorId(eventoId);
    if (!evento) {
      throw new NoEncontradoError(`No existe el evento ${eventoId}`);
    }
    usuario.agregarFavorito(evento);
    await this.usuarios.guardar(usuario);
  }

  async quitarFavorito(usuario, eventoId) {
    usuario.quitarFavorito({ id: eventoId });
    await this.usuarios.guardar(usuario);
  }
}
