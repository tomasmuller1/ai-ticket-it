import { ValidacionError } from "../errors/index.js";

// Valida body, query y params contra schemas de Zod. Los valores ya parseados (con defaults y
// conversiones de tipo) quedan en req.validado, porque en Express 5 req.query es de solo lectura.
export function validar(schemas) {
  return (req, res, next) => {
    const validado = {};
    const detalles = [];

    for (const parte of ["params", "query", "body"]) {
      if (!schemas[parte]) continue;
      const resultado = schemas[parte].safeParse(req[parte] ?? {});
      if (resultado.success) {
        validado[parte] = resultado.data;
      } else {
        detalles.push(
          ...resultado.error.issues.map((issue) => ({
            ubicacion: parte,
            campo: issue.path.join("."),
            mensaje: issue.message,
          })),
        );
      }
    }

    if (detalles.length > 0) {
      return next(new ValidacionError("Los datos enviados no son válidos", detalles));
    }

    req.validado = validado;
    next();
  };
}
