// Medio de pago guardado. Del número solo quedan la marca y los últimos 4 dígitos: la pasarela devuelve
// un token para cobrar, y ni el número completo ni el código de seguridad se guardan nunca.
export class Tarjeta {
  constructor({ id, usuarioId, marca, ultimos4, vencimientoMes, vencimientoAnio, titular, token }) {
    this.id = id;
    this.usuarioId = usuarioId;
    this.marca = marca;
    this.ultimos4 = ultimos4;
    this.vencimientoMes = vencimientoMes;
    this.vencimientoAnio = vencimientoAnio;
    this.titular = titular;
    this.token = token;
  }

  esDe(usuario) {
    return usuario?.id === this.usuarioId;
  }

  // Vence al terminar el mes indicado.
  estaVencida(reloj) {
    const primerDiaDelMesSiguiente = new Date(this.vencimientoAnio, this.vencimientoMes, 1);
    return reloj.ahora() >= primerDiaDelMesSiguiente;
  }
}
