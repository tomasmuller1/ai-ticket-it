import { NoEncontradoError, ReglaNegocioError } from "../errors/index.js";

export class UsuariosService {
  constructor({ usuarios, eventos }) {
    this.usuarios = usuarios;
    this.eventos = eventos;
  }

  // Nombre, apellido y email (ya normalizado por el schema). El email no puede ser de otra cuenta.
  async actualizarPerfil(usuario, { nombre, apellido, email }) {
    if (email && email !== usuario.email) {
      const otro = await this.usuarios.buscarPorEmail(email);
      if (otro && !otro.es(usuario)) {
        throw new ReglaNegocioError("Ya existe una cuenta con ese email", "EMAIL_EN_USO");
      }
      usuario.email = email;
    }
    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellido !== undefined) usuario.apellido = apellido;
    await this.usuarios.guardar(usuario);
    return usuario;
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
