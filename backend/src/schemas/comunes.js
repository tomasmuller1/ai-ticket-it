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
