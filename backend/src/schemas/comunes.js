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
