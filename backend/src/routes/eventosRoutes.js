import { Router } from "express";

import { validar } from "../middlewares/validar.js";
import { z } from "../schemas/zod.js";
import { respuestaError, respuestaJson } from "../schemas/comunes.js";
import { EventoIdParams, EventoRespuesta } from "../schemas/eventos.js";

export function eventosRoutes(eventosController) {
  const router = Router();
  router.get("/", eventosController.listar);
  router.get("/:id", validar({ params: EventoIdParams }), eventosController.obtener);
  return router;
}

export function documentarEventos(registro) {
  registro.registerPath({
    method: "get",
    path: "/api/eventos",
    tags: ["Eventos"],
    summary: "Listar eventos",
    responses: { 200: respuestaJson("Eventos disponibles", z.array(EventoRespuesta)) },
  });

  registro.registerPath({
    method: "get",
    path: "/api/eventos/{id}",
    tags: ["Eventos"],
    summary: "Obtener el detalle de un evento",
    request: { params: EventoIdParams },
    responses: {
      200: respuestaJson("Detalle del evento", EventoRespuesta),
      404: respuestaError("El evento no existe"),
    },
  });
}
