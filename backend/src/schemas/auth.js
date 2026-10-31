import { UsuarioRespuesta } from "./compras.js";
import { z } from "./zod.js";

// Se normaliza antes de validar: "  Sofia@Mail.com " y "sofia@mail.com" son el mismo email.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("El email no es válido").max(254))
  .openapi({ example: "sofia@aiticketit.com" });

// bcrypt solo usa los primeros 72 bytes: más largo no suma seguridad y puede confundir.
const passwordNueva = z
  .string()
  .min(8, "La contraseña tiene que tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar los 72 caracteres")
  .regex(/[A-Za-z]/, "La contraseña tiene que tener al menos una letra")
  .regex(/[0-9]/, "La contraseña tiene que tener al menos un número")
  .openapi({ example: "miClave123" });

export const RegistroBody = z
  .object({
    nombre: z.string().trim().min(1).max(60).openapi({ example: "Sofía" }),
    apellido: z.string().trim().min(1).max(60).openapi({ example: "Ramírez" }),
    email,
    password: passwordNueva,
  })
  .openapi("Registro");

export const LoginBody = z
  .object({
    email,
    password: z.string().min(1).max(200).openapi({ example: "aiticketit123" }),
  })
  .openapi("Login");

export const RefreshBody = z.object({ refreshToken: z.string().min(1).max(200) }).openapi("Refresh");

export const SesionRespuesta = z
  .object({
    accessToken: z.string().openapi({ description: "JWT para el header Authorization: Bearer <token>" }),
    accessTokenExpiraEn: z.string().openapi({ format: "date-time" }),
    refreshToken: z.string().openapi({ description: "Se usa una sola vez en /api/auth/refresh" }),
    refreshTokenExpiraEn: z.string().openapi({ format: "date-time" }),
    usuario: UsuarioRespuesta,
  })
  .openapi("Sesion");
