import { randomUUID } from "node:crypto";
import pino from "pino";
import { pinoHttp } from "pino-http";

export function crearLogger(nivel) {
  return pino({
    level: nivel,
    redact: ["req.headers.authorization", "req.headers.cookie"],
  });
}

// Solo se acepta el id que manda el cliente si tiene un formato razonable (evita logs inflados o falsos).
const ID_VALIDO = /^[A-Za-z0-9._-]{1,128}$/;

// Loguea cada request con un id que también se devuelve en X-Request-Id para poder rastrearla.
export function loggerHttp(logger) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const recibido = req.headers["x-request-id"];
      const id = ID_VALIDO.test(recibido ?? "") ? recibido : randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  });
}
