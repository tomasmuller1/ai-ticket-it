import { z } from "./zod.js";

export const ErrorRespuesta = z
  .object({
    error: z.object({
      codigo: z.string().openapi({ example: "NO_ENCONTRADO" }),
      mensaje: z.string().openapi({ example: "No existe el evento 99" }),
      detalles: z
        .array(z.object({ ubicacion: z.string(), campo: z.string(), mensaje: z.string() }))
        .optional(),
    }),
  })
  .openapi("Error");

export function respuestaError(descripcion) {
  return { description: descripcion, content: { "application/json": { schema: ErrorRespuesta } } };
}

export function respuestaJson(descripcion, schema) {
  return { description: descripcion, content: { "application/json": { schema } } };
}

export const PaginacionQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  pageSize: z.coerce.number().int().min(1).max(50).default(20).openapi({ example: 20 }),
});

// Booleano en la query string: solo "true" o "false" (falso si no viene).
export const booleanoQuery = z
  .enum(["true", "false"])
  .default("false")
  .transform((valor) => valor === "true");

export function paginado(schema, nombre) {
  return z
    .object({
      data: z.array(schema),
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
    })
    .openapi(nombre);
}

// Requisito de seguridad de las rutas protegidas (Authorize en Swagger).
export const SEGURIDAD = [{ bearerAuth: [] }];

const ClaveIdempotencia = z.string().min(1).max(255);

// Header Idempotency-Key de las operaciones que no se pueden repetir (comprar, pagar, cancelar, gestionar un
// evento). Va en validar({ headers }) antes del middleware `idempotente`. Express entrega los headers en
// minúsculas.
export const IdempotenciaHeaders = z.object({ "idempotency-key": ClaveIdempotencia.optional() });

// El mismo header, con su nombre y su descripción para la documentación.
export const IdempotenciaHeadersDoc = z.object({
  "Idempotency-Key": ClaveIdempotencia.optional().openapi({
    description:
      "Identifica la intención de operar (un UUID nuevo por intención, el mismo en cada reintento). Si se repite, se devuelve la respuesta guardada, con el header Idempotent-Replayed, sin volver a operar. Es por usuario; solo se guardan las respuestas exitosas.",
    example: "7c1f3a52-8f2e-4f0b-9a57-2a4d1c6e9b10",
  }),
});
