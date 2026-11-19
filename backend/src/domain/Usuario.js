// Comprador y organizador son roles de la misma clase Usuario, no clases distintas. Cada cuenta elige el
// suyo al registrarse y no lo cambia: el comprador compra, guarda favoritos y reseña; el organizador
// publica y gestiona sus eventos. Los dos exploran y chatean en una compra.
export const RolUsuario = Object.freeze({ COMPRADOR: "COMPRADOR", ORGANIZADOR: "ORGANIZADOR" });

export class Usuario {
  constructor({ id, nombre, apellido, email, googleId = null, rol = RolUsuario.COMPRADOR }) {
    if (!Object.values(RolUsuario).includes(rol)) {
      throw new Error(`Rol de usuario inválido: ${rol}`);
    }
    this.id = id;
    this.rol = rol;
    this.nombre = nombre;
    this.apellido = apellido;
    this.email = email;
    // Cuenta de Google vinculada (inicio de sesión con Google). Una cuenta creada con Google no tiene
    // contraseña hasta que la persona elige una.
    this.googleId = googleId;
    this.favoritos = [];
  }

  tieneContrasenia() {
    return Boolean(this.passwordHash);
  }

  tieneRol(rol) {
    return this.rol === rol;
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
