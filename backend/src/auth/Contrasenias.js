import bcrypt from "bcryptjs";

// Hash de una contraseña que no existe: se usa para que el login tarde lo mismo exista o no el email,
// y así no se pueda averiguar qué emails están registrados midiendo el tiempo de respuesta.
const HASH_INEXISTENTE = "$2b$10$HngIu990Sn1yArBVUtm4M.theXUq6C3GaoogueF1bYj.r0cBDMLmi";

export class Contrasenias {
  constructor({ costo = 10 } = {}) {
    this.costo = costo;
  }

  hashear(contrasenia) {
    return bcrypt.hash(contrasenia, this.costo);
  }

  verificar(contrasenia, hash) {
    return bcrypt.compare(contrasenia, hash ?? HASH_INEXISTENTE);
  }
}
