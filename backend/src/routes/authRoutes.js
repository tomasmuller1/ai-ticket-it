import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { AppError } from "../errors/index.js";
import { validar } from "../middlewares/validar.js";
import { respuestaError, respuestaJson } from "../schemas/comunes.js";
import { LoginBody, RefreshBody, RegistroBody, SesionRespuesta } from "../schemas/auth.js";

const QUINCE_MINUTOS_MS = 15 * 60 * 1000;

// Limita los intentos de login y registro por IP para frenar ataques de fuerza bruta.
function limitarIntentos(intentosMaximos) {
  return rateLimit({
    windowMs: QUINCE_MINUTOS_MS,
    limit: intentosMaximos,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(
        new AppError("Demasiados intentos. Probá de nuevo en unos minutos.", {
          status: 429,
          codigo: "DEMASIADOS_INTENTOS",
        }),
      ),
  });
}

export function authRoutes(controller, { intentosMaximos }) {
  const router = Router();
  const limitado = limitarIntentos(intentosMaximos);
  router.post("/registro", limitado, validar({ body: RegistroBody }), controller.registrar);
  router.post("/login", limitado, validar({ body: LoginBody }), controller.login);
  router.post("/refresh", validar({ body: RefreshBody }), controller.refrescar);
  router.post("/logout", validar({ body: RefreshBody }), controller.cerrarSesion);
  return router;
}

const cuerpo = (schema) => ({ body: { content: { "application/json": { schema } } } });

export function documentarAuth(registro) {
  registro.registerPath({
    method: "post",
    path: "/api/auth/registro",
    tags: ["Autenticación"],
    summary: "Crear una cuenta",
    description: "Devuelve una sesión iniciada. La contraseña necesita 8 caracteres, una letra y un número.",
    request: cuerpo(RegistroBody),
    responses: {
      201: respuestaJson("Cuenta creada y sesión iniciada", SesionRespuesta),
      400: respuestaError("Datos inválidos"),
      409: respuestaError("Ya existe una cuenta con ese email (EMAIL_EN_USO)"),
      429: respuestaError("Demasiados intentos"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/api/auth/login",
    tags: ["Autenticación"],
    summary: "Iniciar sesión",
    description:
      'Los usuarios de ejemplo usan la contraseña "aiticketit123" (por ejemplo, sofia@aiticketit.com).',
    request: cuerpo(LoginBody),
    responses: {
      200: respuestaJson("Sesión iniciada", SesionRespuesta),
      401: respuestaError("Email o contraseña incorrectos"),
      429: respuestaError("Demasiados intentos"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/api/auth/refresh",
    tags: ["Autenticación"],
    summary: "Renovar la sesión",
    description:
      "Cambia un refresh token por una sesión nueva. Cada refresh token sirve una sola vez: reutilizarlo cierra la sesión.",
    request: cuerpo(RefreshBody),
    responses: {
      200: respuestaJson("Sesión renovada", SesionRespuesta),
      401: respuestaError("Refresh token inválido, vencido o reutilizado"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/api/auth/logout",
    tags: ["Autenticación"],
    summary: "Cerrar sesión",
    description: "Invalida el refresh token y todos los de su sesión.",
    request: cuerpo(RefreshBody),
    responses: { 204: { description: "Sesión cerrada" } },
  });
}
