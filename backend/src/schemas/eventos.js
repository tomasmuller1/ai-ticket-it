import { z } from "./zod.js";

export const EventoIdParams = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: "id", in: "path" }, example: "1" }),
});

export const CategoriaResumen = z
  .object({
    id: z.string().openapi({ example: "musica" }),
    nombre: z.string().openapi({ example: "Música" }),
  })
  .openapi("CategoriaResumen");

export const UsuarioResumen = z
  .object({ id: z.string(), nombre: z.string().openapi({ example: "Lucía Fernández" }) })
  .openapi("UsuarioResumen");

export const TipoEntradaRespuesta = z
  .object({
    id: z.string(),
    nombre: z.string().openapi({ example: "VIP" }),
    descripcion: z.string(),
    precio: z.number().openapi({ example: 80000 }),
    disponibles: z.number().int().openapi({ example: 50 }),
  })
  .openapi("TipoEntrada");

export const EventoRespuesta = z
  .object({
    id: z.string(),
    nombre: z.string().openapi({ example: "Recital de Rock Nacional" }),
    descripcion: z.string(),
    categoria: CategoriaResumen,
    fecha: z.string().openapi({ format: "date-time" }),
    lugar: z.string(),
    multimedia: z.array(z.string().openapi({ format: "uri" })),
    organizador: UsuarioResumen,
    precioDesde: z.number(),
    tiposEntrada: z.array(TipoEntradaRespuesta),
  })
  .openapi("Evento");
