import { CRITERIOS_DE_ORDEN } from "../domain/OrdenEventos.js";
import { PaginacionQuery, paginado } from "./comunes.js";
import { z } from "./zod.js";

export const EventoIdParams = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: "id", in: "path" }, example: "e-rock-nacional" }),
});

export const OrganizadorIdParams = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: "id", in: "path" }, example: "u-lucia" }),
});

const booleanoQuery = z
  .enum(["true", "false"])
  .default("false")
  .transform((valor) => valor === "true");

export const BusquedaEventosQuery = PaginacionQuery.extend({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .openapi({ description: "Busca en nombre, descripción, lugar y categoría" }),
  categoria: z.string().optional().openapi({ example: "musica" }),
  precioMin: z.coerce.number().min(0).optional(),
  precioMax: z.coerce.number().min(0).optional(),
  orden: z.enum(CRITERIOS_DE_ORDEN).default("fecha"),
  dir: z.enum(["asc", "desc"]).default("asc"),
  incluirPasados: booleanoQuery.openapi({ description: "Incluir eventos que ya se realizaron" }),
}).refine((q) => q.precioMin === undefined || q.precioMax === undefined || q.precioMin <= q.precioMax, {
  message: "precioMin no puede ser mayor que precioMax",
  path: ["precioMin"],
});

export const CrearEventoBody = z
  .object({
    nombre: z.string().trim().min(3).max(120).openapi({ example: "Recital acústico" }),
    descripcion: z.string().trim().min(1).max(2000),
    categoriaId: z.string().min(1).openapi({ example: "musica" }),
    fecha: z.iso.datetime({ offset: true }).openapi({ example: "2027-03-15T21:00:00-03:00" }),
    lugar: z.string().trim().min(3).max(200).openapi({ example: "La Trastienda, CABA" }),
    multimedia: z.array(z.url()).max(10).default([]),
    tiposEntrada: z
      .array(
        z.object({
          nombre: z.string().trim().min(1).max(50).openapi({ example: "General" }),
          descripcion: z.string().trim().max(200).default(""),
          precio: z.number().min(0).openapi({ example: 20000 }),
          cupo: z.number().int().min(1).max(100000).openapi({ example: 200 }),
        }),
      )
      .min(1)
      .max(10),
  })
  .openapi("CrearEvento");

const CategoriaResumen = z.object({ id: z.string(), nombre: z.string() });

export const Categoria = z
  .object({
    id: z.string().openapi({ example: "musica" }),
    nombre: z.string().openapi({ example: "Música" }),
    descripcion: z.string(),
  })
  .openapi("Categoria");

const Organizador = z
  .object({
    id: z.string(),
    nombre: z.string().openapi({ example: "Lucía Fernández" }),
    puntaje: z
      .number()
      .nullable()
      .openapi({ example: 4.5, description: "Promedio de sus reseñas; null si no tiene" }),
    cantidadResenias: z.number().int(),
  })
  .openapi("Organizador");

export const TipoEntradaRespuesta = z
  .object({
    id: z.string(),
    nombre: z.string().openapi({ example: "VIP" }),
    descripcion: z.string(),
    precio: z.number().openapi({ example: 80000 }),
    cupo: z.number().int(),
    disponibles: z.number().int().openapi({ example: 50 }),
  })
  .openapi("TipoEntrada");

export const ReseniaRespuesta = z
  .object({
    id: z.string(),
    puntuacion: z.number().int().min(1).max(5),
    detalle: z.string(),
    fecha: z.string().openapi({ format: "date-time" }),
    comprador: z.object({ id: z.string(), nombre: z.string() }),
    evento: z.object({ id: z.string(), nombre: z.string() }),
  })
  .openapi("Resenia");

export const EventoResumen = z
  .object({
    id: z.string(),
    nombre: z.string().openapi({ example: "Noche de Rock Nacional" }),
    categoria: CategoriaResumen,
    fecha: z.string().openapi({ format: "date-time" }),
    lugar: z.string(),
    imagen: z.string().nullable(),
    precioDesde: z.number(),
    agotado: z.boolean(),
    organizador: Organizador,
  })
  .openapi("EventoResumen");

export const EventoDetalle = EventoResumen.extend({
  descripcion: z.string(),
  multimedia: z.array(z.string()),
  tiposEntrada: z.array(TipoEntradaRespuesta),
  reseniasRecientes: z.array(ReseniaRespuesta),
}).openapi("EventoDetalle");

export const EventoDeOrganizador = z
  .object({
    id: z.string(),
    nombre: z.string(),
    fecha: z.string().openapi({ format: "date-time" }),
    lugar: z.string(),
    imagen: z.string().nullable(),
    categoria: CategoriaResumen,
    cupoTotal: z.number().int(),
    vendidas: z.number().int(),
    disponibles: z.number().int(),
  })
  .openapi("EventoDeOrganizador");

export const PaginaEventos = paginado(EventoResumen, "PaginaEventos");
export const PaginaResenias = paginado(ReseniaRespuesta, "PaginaResenias");
