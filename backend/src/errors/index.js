// Errores de la aplicación. El errorHandler los traduce a la respuesta HTTP:
// { error: { codigo, mensaje, detalles? } } con el status de cada clase.
export class AppError extends Error {
  constructor(mensaje, { status, codigo, detalles } = {}) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export class ValidacionError extends AppError {
  constructor(mensaje, detalles) {
    super(mensaje, { status: 400, codigo: "VALIDACION", detalles });
  }
}

export class NoAutenticadoError extends AppError {
  constructor(mensaje = "Se requiere autenticación") {
    super(mensaje, { status: 401, codigo: "NO_AUTENTICADO" });
  }
}

export class ProhibidoError extends AppError {
  constructor(mensaje = "No tenés permiso para realizar esta acción") {
    super(mensaje, { status: 403, codigo: "PROHIBIDO" });
  }
}

export class NoEncontradoError extends AppError {
  constructor(mensaje) {
    super(mensaje, { status: 404, codigo: "NO_ENCONTRADO" });
  }
}

// Base de las reglas de negocio que se rompen (sin cupo, transición inválida, etc.).
export class ReglaNegocioError extends AppError {
  constructor(mensaje, codigo = "REGLA_DE_NEGOCIO") {
    super(mensaje, { status: 409, codigo });
  }
}

export class SinCupoError extends ReglaNegocioError {
  constructor(mensaje) {
    super(mensaje, "SIN_CUPO");
  }
}

export class TransicionInvalidaError extends ReglaNegocioError {
  constructor(mensaje) {
    super(mensaje, "TRANSICION_INVALIDA");
  }
}

// Hay un cobro resolviéndose en la pasarela: no se puede iniciar otro ni cancelar hasta saber el resultado.
export class PagoEnProcesoError extends ReglaNegocioError {
  constructor(mensaje = "Hay un pago en proceso para esta compra") {
    super(mensaje, "PAGO_EN_PROCESO");
  }
}

export class ClaveIdempotenciaReutilizadaError extends ReglaNegocioError {
  constructor(mensaje = "Esta clave de idempotencia ya se usó con otros datos") {
    super(mensaje, "CLAVE_IDEMPOTENCIA_REUTILIZADA");
  }
}

// La pasarela evaluó el cobro y no lo aprobó. A diferencia de "no disponible", reintentar con la misma
// tarjeta no sirve.
export class PagoRechazadoError extends ReglaNegocioError {
  constructor(mensaje = "La tarjeta fue rechazada. Probá con otra.") {
    super(mensaje, "PAGO_RECHAZADO");
  }
}

export class EventoFinalizadoError extends ReglaNegocioError {
  constructor(mensaje = "El evento ya se realizó") {
    super(mensaje, "EVENTO_FINALIZADO");
  }
}

// El organizador canceló el evento: no se puede comprar, pagar, validar ni volver a gestionarlo.
export class EventoCanceladoError extends ReglaNegocioError {
  constructor(mensaje = "El evento fue cancelado") {
    super(mensaje, "EVENTO_CANCELADO");
  }
}

// La reserva no se pagó a tiempo: el sistema la canceló y liberó el cupo.
export class ReservaVencidaError extends ReglaNegocioError {
  constructor(mensaje = "Tu reserva venció. Volvé a reservar si todavía querés ir.") {
    super(mensaje, "RESERVA_VENCIDA");
  }
}

// La pasarela de pagos (un servicio externo) no responde: no se puede pagar, reembolsar ni guardar
// tarjetas, pero el resto de la app sigue funcionando. El mensaje aclara que es pasajero, para que la persona
// sepa que va a poder hacerlo más tarde.
export class PasarelaNoDisponibleError extends AppError {
  constructor(
    mensaje = "Los pagos no están disponibles en este momento. Es algo temporal: intentá nuevamente en unos minutos.",
  ) {
    super(mensaje, { status: 503, codigo: "PASARELA_NO_DISPONIBLE" });
  }
}
