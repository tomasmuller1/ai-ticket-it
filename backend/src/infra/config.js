import { z } from "zod";

const esquemaConfig = z.object({
  // Sin NODE_ENV se asume producción: un deploy que se olvida de definirlo falla cerrado (exige
  // JWT_SECRET y CORS_ORIGINS) en lugar de arrancar con el secreto de desarrollo. `npm run dev` lo define.
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  CORS_ORIGINS: z
    .string()
    .default("*")
    .transform((valor) =>
      valor.trim() === "*"
        ? "*"
        : valor
            .split(",")
            .map((origen) => origen.trim())
            .filter(Boolean),
    )
    .refine((origenes) => origenes === "*" || origenes.length > 0, "Debe indicar al menos un origen"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET tiene que tener al menos 32 caracteres").optional(),
  ACCESS_TOKEN_MINUTOS: z.coerce.number().int().min(1).max(60).default(15),
  REFRESH_TOKEN_DIAS: z.coerce.number().int().min(1).max(90).default(30),
  AUTH_INTENTOS_MAXIMOS: z.coerce.number().int().min(1).optional(),
});

// Solo para desarrollo y tests: en producción JWT_SECRET es obligatorio.
const SECRETO_DESARROLLO = "secreto-de-desarrollo-no-usar-en-produccion";

// Lee y valida las variables de entorno una sola vez al arrancar: si algo está mal, falla rápido.
export function cargarConfig(env = process.env) {
  const resultado = esquemaConfig.safeParse(env);
  if (!resultado.success) {
    throw new Error(`Configuración inválida:\n${z.prettifyError(resultado.error)}`);
  }

  const config = resultado.data;
  const pista = env.NODE_ENV ? "" : " (NODE_ENV no está definido, así que se asume producción)";
  if (config.NODE_ENV === "production" && config.CORS_ORIGINS === "*") {
    throw new Error(`Configuración inválida: CORS_ORIGINS no puede ser "*" en producción${pista}`);
  }
  if (config.NODE_ENV === "production" && !config.JWT_SECRET) {
    throw new Error(`Configuración inválida: JWT_SECRET es obligatorio en producción${pista}`);
  }

  return {
    entorno: config.NODE_ENV,
    puerto: config.PORT,
    nivelLog: config.LOG_LEVEL ?? (config.NODE_ENV === "test" ? "silent" : "info"),
    origenesCors: config.CORS_ORIGINS,
    docsHabilitados: config.NODE_ENV !== "production",
    auth: {
      secreto: config.JWT_SECRET ?? SECRETO_DESARROLLO,
      accessTokenMinutos: config.ACCESS_TOKEN_MINUTOS,
      refreshTokenDias: config.REFRESH_TOKEN_DIAS,
      // Intentos de login/registro por IP cada 15 minutos. En tests no se limita salvo que se pida.
      intentosMaximos: config.AUTH_INTENTOS_MAXIMOS ?? (config.NODE_ENV === "test" ? 1000 : 10),
    },
  };
}
