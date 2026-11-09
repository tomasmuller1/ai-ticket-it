import { Router } from "express";

import { validar } from "../middlewares/validar.js";
import { z } from "../schemas/zod.js";
import {
  IdempotenciaHeaders,
  IdempotenciaHeadersDoc,
  PaginacionQuery,
  respuestaError,
  respuestaJson,
  SEGURIDAD,
} from "../schemas/comunes.js";
import {
  BusquedaEventosQuery,
  CancelarEventoBody,
  Categoria,
  CrearEventoBody,
  EventoDeOrganizador,
  EventoDetalle,
  EventoIdParams,
  OrganizadorIdParams,
  PaginaEventos,
  PaginaResenias,
  PosponerEventoBody,
} from "../schemas/eventos.js";

// `idempotencia` es el middleware `idempotente`: va después de `autenticado` y de validar los headers.
export function eventosRoutes(controller, autenticado, idempotencia) {
  const router = Router();
  router.get("/", validar({ query: BusquedaEventosQuery }), controller.buscar);
  router.post("/", autenticado, validar({ body: CrearEventoBody }), controller.crear);
  router.get("/mios", autenticado, controller.mios);
  router.get("/:id", validar({ params: EventoIdParams }), controller.detalle);
  router.post(
    "/:id/postergacion",
    autenticado,
    validar({ params: EventoIdParams, body: PosponerEventoBody, headers: IdempotenciaHeaders }),
    idempotencia,
    controller.posponer,
  );
  router.post(
    "/:id/cancelacion",
    autenticado,
    validar({ params: EventoIdParams, body: CancelarEventoBody, headers: IdempotenciaHeaders }),
    idempotencia,
    controller.cancelar,
  );
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
      "Búsqueda por texto, filtro por categoría y rango de precio, orden por fecha, precio o puntaje del organizador, y paginación. Por defecto devuelve solo eventos próximos. Los eventos cancelados no aparecen nunca, aunque se pidan los pasados: se siguen viendo en su detalle, en favoritos y en los eventos del organizador.",
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

  const ERRORES_GESTION = {
    401: respuestaError("No autenticado"),
    403: respuestaError("El usuario no organiza este evento"),
    404: respuestaError("El evento no existe"),
    409: respuestaError(
      "El evento ya fue cancelado (EVENTO_CANCELADO) o ya se realizó (EVENTO_FINALIZADO), la clave se está usando (OPERACION_EN_CURSO) o se usó con otros datos (CLAVE_IDEMPOTENCIA_REUTILIZADA)",
    ),
  };

  registro.registerPath({
    method: "post",
    path: "/api/eventos/{id}/postergacion",
    tags: ["Eventos"],
    summary: "Posponer un evento",
    description:
      "Solo el organizador, si el evento no se canceló ni se realizó. Cambia la fecha a una posterior y el evento queda POSPUESTO. Las entradas siguen valiendo: las compras UTILIZADAS vuelven a CONFIRMADA (el evento no se hizo, así que el organizador las vuelve a validar en la nueva fecha y el comprador las puede cancelar). Después cada compra vigente (PENDIENTE o CONFIRMADA) recibe un aviso con la fecha nueva, la anterior y el motivo, y quien no pueda ir cancela su compra con reembolso (CU7).",
    security: SEGURIDAD,
    request: {
      params: EventoIdParams,
      headers: IdempotenciaHeadersDoc,
      body: { required: true, content: { "application/json": { schema: PosponerEventoBody } } },
    },
    responses: {
      200: respuestaJson("Evento pospuesto", EventoDeOrganizador),
      400: respuestaError(
        "Fecha inválida, sin zona horaria o no posterior a la actual, o motivo demasiado largo",
      ),
      ...ERRORES_GESTION,
    },
  });

  registro.registerPath({
    method: "post",
    path: "/api/eventos/{id}/cancelacion",
    tags: ["Eventos"],
    summary: "Cancelar un evento",
    description:
      "Solo el organizador, si el evento no se canceló ni se realizó. El evento queda CANCELADO y sale de la búsqueda (el detalle, los favoritos y Mis eventos lo siguen mostrando). Cada compra vigente recibe un aviso y se cancela, incluso las UTILIZADAS; las pagadas se reembolsan y reciben otro aviso cuando vuelve el dinero. Una entrada gratis queda CANCELADA: no hay nada que devolver. Si la pasarela no responde o hay un pago en proceso, el evento se cancela igual y el sistema termina esas compras en segundo plano.",
    security: SEGURIDAD,
    request: {
      params: EventoIdParams,
      headers: IdempotenciaHeadersDoc,
      body: { required: false, content: { "application/json": { schema: CancelarEventoBody } } },
    },
    responses: {
      200: respuestaJson("Evento cancelado", EventoDeOrganizador),
      400: respuestaError("Motivo demasiado largo o clave de idempotencia inválida"),
      ...ERRORES_GESTION,
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
