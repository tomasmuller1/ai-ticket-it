// Un único tipo de usuario: es comprador cuando compra y organizador cuando publica eventos.
export class Usuario {
  constructor({ id, nombre, apellido, email }) {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.email = email;
    this.favoritos = [];
  }

  es(otro) {
    return otro?.id === this.id;
  }

  nombreCompleto() {
    return `${this.nombre} ${this.apellido}`;
  }

  esFavorito(evento) {
    return this.favoritos.some((favorito) => favorito.id === evento.id);
  }

  agregarFavorito(evento) {
    if (!this.esFavorito(evento)) {
      this.favoritos.push(evento);
    }
  }

  quitarFavorito(evento) {
    this.favoritos = this.favoritos.filter((favorito) => favorito.id !== evento.id);
  }
}
