import { Router } from "express";

import { validar } from "../middlewares/validar.js";
import { respuestaError, respuestaJson, SEGURIDAD } from "../schemas/comunes.js";
import {
  LecturaNotificaciones,
  MarcarLeidasBody,
  NotificacionesQuery,
  NotificacionIdParams,
  NotificacionRespuesta,
  PaginaNotificaciones,
  ResumenNotificaciones,
} from "../schemas/notificaciones.js";

// Todas son del usuario autenticado. /resumen y /lectura van antes que /:id.
export function notificacionesRoutes(controller, autenticado) {
  const router = Router();
  router.use(autenticado);
  router.get("/", validar({ query: NotificacionesQuery }), controller.listar);
  router.get("/resumen", controller.resumen);
  router.post("/lectura", validar({ body: MarcarLeidasBody }), controller.marcarLeidas);
  router.post("/:id/lectura", validar({ params: NotificacionIdParams }), controller.marcarLeida);
  return router;
}

const NO_AUTENTICADO = { 401: respuestaError("No autenticado") };

export function documentarNotificaciones(registro) {
  registro.registerPath({
    method: "get",
    path: "/api/notificaciones",
    tags: ["Notificaciones"],
    summary: "Mis notificaciones",
    description:
      "Avisos del usuario autenticado, de la más reciente a la más vieja. Al comprador: pago aprobado o rechazado, reserva vencida, reembolso y entrada validada. Al organizador: cuando se agota un tipo de entrada o el evento entero, una sola vez. A los dos: mensajes nuevos del chat; mientras no se leen, los de una compra se juntan en una notificación que los cuenta y muestra el último.",
    security: SEGURIDAD,
    request: { query: NotificacionesQuery },
    responses: {
      200: respuestaJson("Página de notificaciones", PaginaNotificaciones),
      400: respuestaError("Parámetros inválidos"),
      ...NO_AUTENTICADO,
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/notificaciones/resumen",
    tags: ["Notificaciones"],
    summary: "Cuántas notificaciones no leí",
    description: "Para la burbuja de la campana. La app lo consulta periódicamente.",
    security: SEGURIDAD,
    responses: {
      200: respuestaJson("Cantidad de no leídas", ResumenNotificaciones),
      ...NO_AUTENTICADO,
    },
  });

  registro.registerPath({
    method: "post",
    path: "/api/notificaciones/lectura",
    tags: ["Notificaciones"],
    summary: "Marcar como leídas todas mis notificaciones",
    description:
      "Sin body marca todas las no leídas. Con `compraId`, solo las de esa compra: la app lo usa al abrir su chat.",
    security: SEGURIDAD,
    request: {
      body: { required: false, content: { "application/json": { schema: MarcarLeidasBody } } },
    },
    responses: {
      200: respuestaJson("Cuántas se marcaron", LecturaNotificaciones),
      400: respuestaError("compraId inválido"),
      ...NO_AUTENTICADO,
    },
  });

  registro.registerPath({
    method: "post",
    path: "/api/notificaciones/{id}/lectura",
    tags: ["Notificaciones"],
    summary: "Marcar una notificación como leída",
    security: SEGURIDAD,
    request: { params: NotificacionIdParams },
    responses: {
      200: respuestaJson("La notificación, ya leída", NotificacionRespuesta),
      ...NO_AUTENTICADO,
      404: respuestaError("La notificación no existe o es de otra persona"),
    },
  });
}
