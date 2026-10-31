import { z } from "./zod.js";

export const EventoIdParams = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: "id", in: "path" }, example: "1" }),
});

export const TipoEntradaRespuesta = z
  .object({
    id: z.string(),
    nombre: z.string().openapi({ example: "VIP" }),
    precio: z.number().openapi({ example: 80000 }),
    disponibles: z.number().int().openapi({ example: 50 }),
  })
  .openapi("TipoEntrada");

export const EventoRespuesta = z
  .object({
    id: z.string(),
    titulo: z.string().openapi({ example: "Recital de Rock Nacional" }),
    descripcion: z.string(),
    categoria: z.string().openapi({ example: "Música" }),
    fecha: z.string().openapi({ format: "date-time" }),
    lugar: z.string(),
    organizadorId: z.string(),
    precioDesde: z.number(),
    tiposEntrada: z.array(TipoEntradaRespuesta),
  })
  .openapi("Evento");
