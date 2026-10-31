import { NoEncontradoError } from "../errors/index.js";

export class EventosService {
  constructor(eventosRepository) {
    this.eventosRepository = eventosRepository;
  }

  listar() {
    return this.eventosRepository.findAll();
  }

  obtener(id) {
    const evento = this.eventosRepository.findById(id);
    if (!evento) {
      throw new NoEncontradoError(`No existe el evento ${id}`);
    }
    return evento;
  }
}
