import { randomUUID } from "node:crypto";

// Persistencia en memoria con una interfaz asíncrona, igual a la que tendría un repositorio sobre una
// base de datos real: cambiar de implementación no obliga a tocar los services.
export class RepositorioEnMemoria {
  #items = new Map();

  constructor(items = []) {
    this.reemplazarTodo(items);
  }

  async buscarPorId(id) {
    return this.#items.get(id) ?? null;
  }

  async buscarTodos() {
    return [...this.#items.values()];
  }

  async buscarDonde(condicion) {
    return [...this.#items.values()].filter(condicion);
  }

  async guardar(entidad) {
    entidad.id ??= randomUUID();
    this.#items.set(entidad.id, entidad);
    return entidad;
  }

  async eliminar(id) {
    this.#items.delete(id);
  }

  // Usado para cargar o restaurar los datos de ejemplo.
  reemplazarTodo(items) {
    this.#items = new Map(items.map((item) => [item.id, item]));
  }
}
