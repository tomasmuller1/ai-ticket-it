// Cada login abre una "familia" de refresh tokens. Al refrescar, el token usado se marca y se emite
// otro de la misma familia (rotación). Si alguien reutiliza un token ya usado, es señal de robo:
// se revoca toda la familia y hay que volver a iniciar sesión.
export class RefreshToken {
  constructor({ id, usuarioId, familia, hash, expiraEn }) {
    this.id = id;
    this.usuarioId = usuarioId;
    this.familia = familia;
    this.hash = hash;
    this.expiraEn = expiraEn;
    this.usado = false;
    this.revocado = false;
  }

  estaVigente(reloj) {
    return !this.usado && !this.revocado && reloj.ahora() < this.expiraEn;
  }
}
