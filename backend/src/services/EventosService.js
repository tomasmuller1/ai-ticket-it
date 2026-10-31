import { NoEncontradoError } from "../errors/index.js";

export class EventosService {
  constructor({ eventos }) {
    this.eventos = eventos;
  }

  listar() {
    return this.eventos.buscarTodos();
  }

  async obtener(id) {
    const evento = await this.eventos.buscarPorId(id);
    if (!evento) {
      throw new NoEncontradoError(`No existe el evento ${id}`);
    }
    return evento;
  }
}
