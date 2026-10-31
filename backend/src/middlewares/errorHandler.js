import { AppError, NoEncontradoError } from "../errors/index.js";

export function rutaNoEncontrada(req, res, next) {
  next(new NoEncontradoError(`No existe la ruta ${req.method} ${req.path}`));
}

// Middleware de 4 parámetros: Express lo usa solo para errores. Va al final de la cadena.
export function errorHandler(err, req, res, next) {
  // Si la respuesta ya empezó a enviarse no se puede cambiar: Express cierra la conexión.
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { codigo: err.codigo, mensaje: err.message, ...(err.detalles && { detalles: err.detalles }) },
    });
  }

  // Errores que lanza el propio Express al parsear el body (JSON mal formado, body demasiado grande).
  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ error: { codigo: "JSON_INVALIDO", mensaje: "El body no es un JSON válido" } });
  }
  if (err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ error: { codigo: "BODY_DEMASIADO_GRANDE", mensaje: "El body es demasiado grande" } });
  }

  // Cualquier otra cosa es un bug: se loguea completo y al cliente le llega un mensaje genérico.
  req.log?.error({ err }, "Error inesperado");
  res.status(500).json({ error: { codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" } });
}
