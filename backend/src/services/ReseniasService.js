import { Resenia } from "../domain/Resenia.js";
import { paginar } from "../utils/paginar.js";

export const SIN_RESENIAS = Object.freeze({ puntaje: null, cantidadResenias: 0 });

// Reputación de los organizadores: el promedio de las reseñas de todos sus eventos (CU10, CU11).
export class ReseniasService {
  constructor({ resenias }) {
    this.resenias = resenias;
  }

  async reputaciones() {
    const porOrganizador = new Map();
    for (const resenia of await this.resenias.buscarTodos()) {
      const id = resenia.evento.organizador.id;
      porOrganizador.set(id, [...(porOrganizador.get(id) ?? []), resenia]);
    }
    return new Map(
      [...porOrganizador].map(([id, lista]) => [
        id,
        { puntaje: Resenia.promedio(lista), cantidadResenias: lista.length },
      ]),
    );
  }

  async reputacionDe(organizadorId) {
    const lista = await this.resenias.buscarPorOrganizador(organizadorId);
    return lista.length ? { puntaje: Resenia.promedio(lista), cantidadResenias: lista.length } : SIN_RESENIAS;
  }

  async listarDeOrganizador(organizadorId, paginacion) {
    const lista = await this.resenias.buscarPorOrganizador(organizadorId);
    return paginar(
      lista.sort((a, b) => b.fecha - a.fecha),
      paginacion,
    );
  }
}
