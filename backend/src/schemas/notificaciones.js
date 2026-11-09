import { TipoNotificacion } from "../domain/Notificacion.js";
import { booleanoQuery, PaginacionQuery, paginado } from "./comunes.js";
import { z } from "./zod.js";

export const NotificacionIdParams = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: "id", in: "path" }, example: "n-03" }),
});

export const NotificacionesQuery = PaginacionQuery.extend({
  soloNoLeidas: booleanoQuery.openapi({ description: "Solo las que todavía no se leyeron" }),
});

export const MarcarLeidasBody = z
  .object({
    compraId: z.string().min(1).optional().openapi({
      description:
        "Marca solo los mensajes del chat (MENSAJE_NUEVO) de esa compra, al abrir su chat. Sin él, marca todas",
      example: "c-01",
    }),
  })
  .openapi("MarcarLeidas");

export const NotificacionRespuesta = z
  .object({
    id: z.string().openapi({ example: "n-03" }),
    tipo: z.enum(Object.values(TipoNotificacion)),
    titulo: z.string().openapi({ example: "Lucía te escribió por Noche de Rock Nacional" }),
    cuerpo: z.string().openapi({ example: "Hola Sofía, abrimos a las 19 h. ¡Te esperamos!" }),
    fechaHora: z.string().openapi({
      format: "date-time",
      description: "Cuándo llegó. En las de mensajes, cuándo llegó el último",
    }),
    leida: z.boolean(),
    evento: z.object({ id: z.string(), nombre: z.string() }),
    compraId: z.string().nullable().openapi({
      description:
        "La compra a la que se refiere. En MENSAJE_NUEVO, la del chat que hay que abrir. null en los avisos del evento (ENTRADAS_AGOTADAS, EVENTO_AGOTADO)",
    }),
  })
  .openapi("Notificacion");

export const PaginaNotificaciones = paginado(NotificacionRespuesta, "PaginaNotificaciones");

export const ResumenNotificaciones = z
  .object({ noLeidas: z.number().int().openapi({ example: 2 }) })
  .openapi("ResumenNotificaciones");

export const LecturaNotificaciones = z
  .object({ marcadas: z.number().int().openapi({ example: 2, description: "Cuántas pasaron a leídas" }) })
  .openapi("LecturaNotificaciones");
