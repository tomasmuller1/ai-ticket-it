export const TipoNotificacion = Object.freeze({
  PAGO_CONFIRMADO: "PAGO_CONFIRMADO",
  PAGO_RECHAZADO: "PAGO_RECHAZADO",
  RESERVA_VENCIDA: "RESERVA_VENCIDA",
  REEMBOLSO_REALIZADO: "REEMBOLSO_REALIZADO",
  ENTRADA_UTILIZADA: "ENTRADA_UTILIZADA",
  MENSAJE_NUEVO: "MENSAJE_NUEVO",
  ENTRADAS_AGOTADAS: "ENTRADAS_AGOTADAS",
  EVENTO_AGOTADO: "EVENTO_AGOTADO",
  EVENTO_POSPUESTO: "EVENTO_POSPUESTO",
  EVENTO_CANCELADO: "EVENTO_CANCELADO",
});

// Aviso in-app para un usuario. El texto ya viene armado (lo arma NotificacionesService) y se guarda tal cual:
// la app lo muestra sin interpretarlo. `compra` es null en los avisos que son del evento (agotados).
export class Notificacion {
  constructor({
    id,
    destinatario,
    tipo,
    titulo,
    cuerpo,
    evento,
    compra = null,
    tipoEntrada = null,
    fechaHora,
    leida = false,
    cantidad = 1,
  }) {
    this.id = id;
    this.destinatario = destinatario;
    this.tipo = tipo;
    this.titulo = titulo;
    this.cuerpo = cuerpo;
    this.evento = evento;
    this.compra = compra;
    this.tipoEntrada = tipoEntrada;
    this.fechaHora = fechaHora;
    this.leida = leida;
    // Cuántos mensajes del chat junta: los que llegan mientras no se lee van a la misma notificación.
    this.cantidad = cantidad;
  }

  esDe(usuario) {
    return this.destinatario.es(usuario);
  }

  marcarLeida() {
    this.leida = true;
  }

  // Otro mensaje del mismo chat antes de que se lea: se cuenta y pasa a mostrar el último.
  sumarMensaje({ titulo, cuerpo }, reloj) {
    this.cantidad += 1;
    this.titulo = titulo;
    this.cuerpo = cuerpo;
    this.fechaHora = reloj.ahora();
  }
}
