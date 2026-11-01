import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { AppError } from "../errors/index.js";
import { validar } from "../middlewares/validar.js";
import { respuestaError, respuestaJson, SEGURIDAD } from "../schemas/comunes.js";
import {
  ContraseniaBody,
  GoogleBody,
  LoginBody,
  RefreshBody,
  RegistroBody,
  SesionRespuesta,
} from "../schemas/auth.js";

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

export function authRoutes(controller, { intentosMaximos }, autenticado) {
  const router = Router();
  const limitado = limitarIntentos(intentosMaximos);
  router.post("/registro", limitado, validar({ body: RegistroBody }), controller.registrar);
  router.post("/login", limitado, validar({ body: LoginBody }), controller.login);
  router.post("/google", limitado, validar({ body: GoogleBody }), controller.loginConGoogle);
  router.put(
    "/contrasenia",
    autenticado,
    limitado,
    validar({ body: ContraseniaBody }),
    controller.cambiarContrasenia,
  );
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

  registro.registerPath({
    method: "post",
    path: "/api/auth/google",
    tags: ["Autenticación"],
    summary: "Iniciar sesión con Google",
    description:
      "Recibe el ID token que Google le da a la app y devuelve una sesión. Si ya existe una cuenta con ese email (verificado por Google) se vincula; si no, se crea una cuenta nueva sin contraseña.",
    request: cuerpo(GoogleBody),
    responses: {
      200: respuestaJson("Sesión iniciada", SesionRespuesta),
      400: respuestaError("Falta el token"),
      401: respuestaError("Google no validó el token o el email no está verificado"),
      429: respuestaError("Demasiados intentos"),
      503: respuestaError("El SSO no está configurado en el servidor (SSO_NO_CONFIGURADO)"),
    },
  });

  registro.registerPath({
    method: "put",
    path: "/api/auth/contrasenia",
    tags: ["Autenticación"],
    summary: "Cambiar la contraseña",
    description:
      "Pide la contraseña actual (salvo en cuentas creadas con Google sin contraseña). Cierra las sesiones de los otros dispositivos y devuelve una sesión nueva para este.",
    security: SEGURIDAD,
    request: cuerpo(ContraseniaBody),
    responses: {
      200: respuestaJson("Contraseña cambiada", SesionRespuesta),
      400: respuestaError("La contraseña actual no es correcta o la nueva no es segura"),
      401: respuestaError("No autenticado"),
      429: respuestaError("Demasiados intentos"),
    },
  });
}
