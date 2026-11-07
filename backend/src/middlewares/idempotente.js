import { createHash } from "node:crypto";

import { ClaveIdempotenciaReutilizadaError, ReglaNegocioError } from "../errors/index.js";

function huellaDe(req) {
  const contenido = `${req.method} ${req.originalUrl} ${JSON.stringify(req.body ?? {})}`;
  return createHash("sha256").update(contenido).digest("hex");
}

// Si el cliente manda Idempotency-Key, la misma clave devuelve la misma respuesta sin volver a ejecutar la
// operación: así un reintento (porque se perdió la respuesta, por ejemplo) no cobra dos veces. Las claves son
// por usuario. Solo se guardan las respuestas exitosas: un error no cambió nada, así que repetir la
// request con la misma clave vuelve a intentarlo. Va después de `autenticado` y de `validar`.
export function idempotente(claves) {
  return async (req, res, next) => {
    const clave = req.validado.headers?.["idempotency-key"];
    if (!clave) return next();

    const huella = huellaDe(req);
    const { entidad: registro, creada } = await claves.guardarSiNoExiste({
      id: `${req.usuario.id}:${clave}`,
      huella,
      respuesta: null,
    });

    if (!creada) {
      if (registro.huella !== huella) throw new ClaveIdempotenciaReutilizadaError();
      if (!registro.respuesta) {
        throw new ReglaNegocioError("Ya hay una operación en curso con esta clave", "OPERACION_EN_CURSO");
      }
      const { status, cuerpo, location } = registro.respuesta;
      if (location) res.location(location);
      return res.set("Idempotent-Replayed", "true").status(status).json(cuerpo);
    }

    const responder = res.json.bind(res);
    res.json = (cuerpo) => {
      if (res.statusCode < 300) {
        registro.respuesta = { status: res.statusCode, cuerpo, location: res.get("Location") };
        claves.guardar(registro);
      } else {
        claves.eliminar(registro.id);
      }
      return responder(cuerpo);
    };
    next();
  };
}
