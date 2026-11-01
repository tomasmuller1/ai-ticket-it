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

export class EventoFinalizadoError extends ReglaNegocioError {
  constructor(mensaje = "El evento ya se realizó") {
    super(mensaje, "EVENTO_FINALIZADO");
  }
}

// La pasarela de pagos (un servicio externo) no responde: no se puede pagar, reembolsar ni guardar
// tarjetas, pero el resto de la app sigue funcionando.
export class PasarelaNoDisponibleError extends AppError {
  constructor(mensaje = "Los pagos no están disponibles en este momento. Probá de nuevo en unos minutos.") {
    super(mensaje, { status: 503, codigo: "PASARELA_NO_DISPONIBLE" });
  }
}
