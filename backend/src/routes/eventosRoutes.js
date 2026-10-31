import { Router } from "express";

import { validar } from "../middlewares/validar.js";
import { z } from "../schemas/zod.js";
import { PaginacionQuery, respuestaError, respuestaJson, SEGURIDAD } from "../schemas/comunes.js";
import {
  BusquedaEventosQuery,
  Categoria,
  CrearEventoBody,
  EventoDeOrganizador,
  EventoDetalle,
  EventoIdParams,
  OrganizadorIdParams,
  PaginaEventos,
  PaginaResenias,
} from "../schemas/eventos.js";

export function eventosRoutes(controller, autenticado) {
  const router = Router();
  router.get("/", validar({ query: BusquedaEventosQuery }), controller.buscar);
  router.post("/", autenticado, validar({ body: CrearEventoBody }), controller.crear);
  router.get("/mios", autenticado, controller.mios);
  router.get("/:id", validar({ params: EventoIdParams }), controller.detalle);
  return router;
}

export function categoriasRoutes(controller) {
  const router = Router();
  router.get("/", controller.listar);
  return router;
}

export function organizadoresRoutes(controller) {
  const router = Router();
  router.get(
    "/:id/resenias",
    validar({ params: OrganizadorIdParams, query: PaginacionQuery }),
    controller.resenias,
  );
  return router;
}

export function documentarEventos(registro) {
  registro.registerPath({
    method: "get",
    path: "/api/eventos",
    tags: ["Eventos"],
    summary: "Buscar eventos (CU3, CU11)",
    description:
      "Búsqueda por texto, filtro por categoría y rango de precio, orden por fecha, precio o puntaje del organizador, y paginación. Por defecto devuelve solo eventos próximos.",
    request: { query: BusquedaEventosQuery },
    responses: {
      200: respuestaJson("Página de eventos", PaginaEventos),
      400: respuestaError("Parámetros inválidos"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/api/eventos",
    tags: ["Eventos"],
    summary: "Crear un evento (CU4)",
    description: "El organizador es el usuario autenticado.",
    security: SEGURIDAD,
    request: { body: { content: { "application/json": { schema: CrearEventoBody } } } },
    responses: {
      201: respuestaJson("Evento creado", EventoDetalle),
      400: respuestaError("Datos inválidos, categoría inexistente o fecha pasada"),
      401: respuestaError("No autenticado"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/eventos/mios",
    tags: ["Eventos"],
    summary: "Eventos que organiza el usuario autenticado",
    security: SEGURIDAD,
    responses: {
      200: respuestaJson("Eventos con el avance de sus ventas", z.array(EventoDeOrganizador)),
      401: respuestaError("No autenticado"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/eventos/{id}",
    tags: ["Eventos"],
    summary: "Detalle de un evento (CU10)",
    description: "Incluye los tipos de entrada con su disponibilidad y la reputación del organizador.",
    request: { params: EventoIdParams },
    responses: {
      200: respuestaJson("Detalle del evento", EventoDetalle),
      404: respuestaError("El evento no existe"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/categorias",
    tags: ["Eventos"],
    summary: "Listar categorías",
    responses: { 200: respuestaJson("Categorías", z.array(Categoria)) },
  });

  registro.registerPath({
    method: "get",
    path: "/api/organizadores/{id}/resenias",
    tags: ["Eventos"],
    summary: "Reseñas de los eventos de un organizador (CU10)",
    request: { params: OrganizadorIdParams, query: PaginacionQuery },
    responses: { 200: respuestaJson("Página de reseñas, de la más reciente a la más vieja", PaginaResenias) },
  });
}
