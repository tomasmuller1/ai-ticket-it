import { z } from "zod";

const esquemaConfig = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
});

// Lee y valida las variables de entorno una sola vez al arrancar: si algo está mal, falla rápido.
export function cargarConfig(env = process.env) {
  const resultado = esquemaConfig.safeParse(env);
  if (!resultado.success) {
    throw new Error(`Configuración inválida:\n${z.prettifyError(resultado.error)}`);
  }

  const config = resultado.data;
  if (config.NODE_ENV === "production" && config.CORS_ORIGINS === "*") {
    throw new Error('Configuración inválida: CORS_ORIGINS no puede ser "*" en producción');
  }

  return {
    entorno: config.NODE_ENV,
    puerto: config.PORT,
    nivelLog: config.LOG_LEVEL ?? (config.NODE_ENV === "test" ? "silent" : "info"),
    origenesCors: config.CORS_ORIGINS,
    docsHabilitados: config.NODE_ENV !== "production",
  };
}
