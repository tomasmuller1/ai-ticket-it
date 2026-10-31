export class CategoriasService {
  constructor({ categorias }) {
    this.categorias = categorias;
  }

  async listar() {
    const categorias = await this.categorias.buscarTodos();
    return categorias.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }
}
