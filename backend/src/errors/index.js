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
