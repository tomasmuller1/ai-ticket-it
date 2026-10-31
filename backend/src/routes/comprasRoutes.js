import { Router } from "express";

import { validar } from "../middlewares/validar.js";
import { z } from "../schemas/zod.js";
import { respuestaError, respuestaJson, SEGURIDAD } from "../schemas/comunes.js";
import {
  CompraDetalle,
  CompraIdParams,
  CompraRespuesta,
  ComprasDeEvento,
  CrearCompraBody,
  EnviarMensajeBody,
  EventoIdParams,
  EventoResumen,
  FavoritoParams,
  FiltroEstadoQuery,
  MensajeRespuesta,
  MensajesQuery,
  ReseniarBody,
  UsuarioRespuesta,
} from "../schemas/compras.js";
import { ReseniaRespuesta } from "../schemas/eventos.js";
import { PerfilBody } from "../schemas/auth.js";

// Todas las rutas de este archivo requieren un usuario autenticado.
export function comprasRoutes(controller, autenticado) {
  const router = Router();
  router.use(autenticado);
  const porId = validar({ params: CompraIdParams });

  router.post("/", validar({ body: CrearCompraBody }), controller.crear);
  router.get("/", validar({ query: FiltroEstadoQuery }), controller.misCompras);
  router.get("/:id", porId, controller.detalle);
  router.post("/:id/pago", porId, controller.pagar);
  router.post("/:id/cancelacion", porId, controller.cancelar);
  router.post("/:id/uso", porId, controller.validarEntrada);
  router.get("/:id/mensajes", validar({ params: CompraIdParams, query: MensajesQuery }), controller.mensajes);
  router.post(
    "/:id/mensajes",
    validar({ params: CompraIdParams, body: EnviarMensajeBody }),
    controller.enviarMensaje,
  );
  router.post("/:id/resenia", validar({ params: CompraIdParams, body: ReseniarBody }), controller.reseniar);
  return router;
}

// Se monta en /api/eventos: GET /api/eventos/:id/compras (CU2).
export function comprasDeEventoRoutes(controller, autenticado) {
  const router = Router();
  router.get(
    "/:id/compras",
    autenticado,
    validar({ params: EventoIdParams, query: FiltroEstadoQuery }),
    controller.comprasDeEvento,
  );
  return router;
}

export function usuariosRoutes(controller, autenticado) {
  const router = Router();
  router.use(autenticado);
  router.get("/me", controller.yo);
  router.patch("/me", validar({ body: PerfilBody }), controller.actualizarPerfil);
  router.get("/me/favoritos", controller.favoritos);
  router.put("/me/favoritos/:eventoId", validar({ params: FavoritoParams }), controller.agregarFavorito);
  router.delete("/me/favoritos/:eventoId", validar({ params: FavoritoParams }), controller.quitarFavorito);
  return router;
}

const ERRORES_COMPRA = {
  401: respuestaError("No autenticado"),
  403: respuestaError("La compra no es del usuario ni de un evento que organiza"),
  404: respuestaError("La compra no existe"),
};

function accion(registro, { path, summary, description, responses = {} }) {
  registro.registerPath({
    method: "post",
    path,
    tags: ["Compras"],
    summary,
    description,
    security: SEGURIDAD,
    request: { params: CompraIdParams },
    responses: {
      200: respuestaJson("Compra actualizada", CompraDetalle),
      ...ERRORES_COMPRA,
      409: respuestaError("La acción no está permitida en el estado actual de la compra"),
      ...responses,
    },
  });
}

export function documentarCompras(registro) {
  registro.registerPath({
    method: "post",
    path: "/api/compras",
    tags: ["Compras"],
    summary: "Comprar entradas (CU12)",
    description:
      "Crea la compra en estado PENDIENTE y reserva el cupo. No se puede superar el cupo disponible ni comprar entradas de un evento propio o ya realizado.",
    security: SEGURIDAD,
    request: { body: { content: { "application/json": { schema: CrearCompraBody } } } },
    responses: {
      201: respuestaJson("Compra creada", CompraDetalle),
      400: respuestaError("Datos inválidos o tipo de entrada que no es del evento"),
      401: respuestaError("No autenticado"),
      404: respuestaError("El evento no existe"),
      409: respuestaError("Sin cupo (SIN_CUPO), evento finalizado o evento propio"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/compras",
    tags: ["Compras"],
    summary: "Mis compras (CU1)",
    description: "Compras del usuario autenticado, con su estado y los días que faltan si están CONFIRMADAS.",
    security: SEGURIDAD,
    request: { query: FiltroEstadoQuery },
    responses: {
      200: respuestaJson("Compras, la más reciente primero", z.array(CompraRespuesta)),
      401: respuestaError("No autenticado"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/compras/{id}",
    tags: ["Compras"],
    summary: "Detalle de una compra",
    description: "Lo pueden ver el comprador y el organizador del evento. Incluye el historial de estados.",
    security: SEGURIDAD,
    request: { params: CompraIdParams },
    responses: { 200: respuestaJson("Detalle de la compra", CompraDetalle), ...ERRORES_COMPRA },
  });

  accion(registro, {
    path: "/api/compras/{id}/pago",
    summary: "Pagar una compra pendiente",
    description: "Cobra con la pasarela de pagos (simulada) y la compra pasa a CONFIRMADA.",
  });
  accion(registro, {
    path: "/api/compras/{id}/cancelacion",
    summary: "Cancelar una compra (CU7, CU8)",
    description:
      "Solo el comprador, si la compra no está UTILIZADA y el evento no se realizó. Si estaba pagada se reembolsa y queda REEMBOLSADA.",
  });
  accion(registro, {
    path: "/api/compras/{id}/uso",
    summary: "Validar la entrada en el ingreso",
    description: "Solo el organizador del evento. La compra pasa de CONFIRMADA a UTILIZADA.",
  });

  registro.registerPath({
    method: "get",
    path: "/api/compras/{id}/mensajes",
    tags: ["Chat"],
    summary: "Mensajes del chat de una compra (CU5, CU6)",
    security: SEGURIDAD,
    request: { params: CompraIdParams, query: MensajesQuery },
    responses: {
      200: respuestaJson("Mensajes en orden de envío", z.array(MensajeRespuesta)),
      ...ERRORES_COMPRA,
    },
  });

  registro.registerPath({
    method: "post",
    path: "/api/compras/{id}/mensajes",
    tags: ["Chat"],
    summary: "Enviar un mensaje en el chat de una compra (CU5, CU6)",
    description: "Pueden escribir el comprador y el organizador, en cualquier estado de la compra.",
    security: SEGURIDAD,
    request: {
      params: CompraIdParams,
      body: { content: { "application/json": { schema: EnviarMensajeBody } } },
    },
    responses: {
      201: respuestaJson("Mensaje enviado", MensajeRespuesta),
      400: respuestaError("Mensaje vacío o demasiado largo"),
      ...ERRORES_COMPRA,
    },
  });

  registro.registerPath({
    method: "post",
    path: "/api/compras/{id}/resenia",
    tags: ["Compras"],
    summary: "Reseñar el evento de una compra utilizada (CU9)",
    security: SEGURIDAD,
    request: { params: CompraIdParams, body: { content: { "application/json": { schema: ReseniarBody } } } },
    responses: {
      201: respuestaJson("Reseña creada", ReseniaRespuesta),
      400: respuestaError("Puntuación o detalle inválidos"),
      ...ERRORES_COMPRA,
      409: respuestaError("La compra no está UTILIZADA o ya tiene reseña"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/eventos/{id}/compras",
    tags: ["Compras"],
    summary: "Compras de un evento (CU2)",
    description: "Solo para el organizador: compras con su estado y entradas vendidas/disponibles por tipo.",
    security: SEGURIDAD,
    request: { params: EventoIdParams, query: FiltroEstadoQuery },
    responses: {
      200: respuestaJson("Compras del evento y resumen por tipo de entrada", ComprasDeEvento),
      401: respuestaError("No autenticado"),
      403: respuestaError("El usuario no organiza este evento"),
      404: respuestaError("El evento no existe"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/usuarios/me",
    tags: ["Usuarios"],
    summary: "Usuario autenticado",
    security: SEGURIDAD,
    responses: { 200: respuestaJson("Usuario", UsuarioRespuesta), 401: respuestaError("No autenticado") },
  });

  registro.registerPath({
    method: "patch",
    path: "/api/usuarios/me",
    tags: ["Usuarios"],
    summary: "Editar mis datos",
    description: "Cambia el nombre, el apellido o el email. Hay que mandar al menos uno.",
    security: SEGURIDAD,
    request: { body: { content: { "application/json": { schema: PerfilBody } } } },
    responses: {
      200: respuestaJson("Datos actualizados", UsuarioRespuesta),
      400: respuestaError("Datos inválidos"),
      401: respuestaError("No autenticado"),
      409: respuestaError("Ya existe una cuenta con ese email (EMAIL_EN_USO)"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/usuarios/me/favoritos",
    tags: ["Usuarios"],
    summary: "Mis eventos favoritos",
    security: SEGURIDAD,
    responses: {
      200: respuestaJson("Favoritos", z.array(EventoResumen)),
      401: respuestaError("No autenticado"),
    },
  });

  for (const method of ["put", "delete"]) {
    registro.registerPath({
      method,
      path: "/api/usuarios/me/favoritos/{eventoId}",
      tags: ["Usuarios"],
      summary: method === "put" ? "Agregar un evento a favoritos" : "Quitar un evento de favoritos",
      security: SEGURIDAD,
      request: { params: FavoritoParams },
      responses: {
        204: { description: "Listo" },
        401: respuestaError("No autenticado"),
        ...(method === "put" && { 404: respuestaError("El evento no existe") }),
      },
    });
  }
}
