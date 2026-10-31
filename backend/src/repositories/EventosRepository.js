// Persistencia en memoria: los datos se pierden al reiniciar el servidor.
export class EventosRepository {
  constructor(eventos = []) {
    this.eventos = [...eventos];
  }

  findAll() {
    return this.eventos;
  }

  findById(id) {
    return this.eventos.find((evento) => evento.id === id);
  }
}
