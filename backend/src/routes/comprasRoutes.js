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
  IdempotenciaHeaders,
  IdempotenciaHeadersDoc,
  MensajeRespuesta,
  MensajesQuery,
  OperacionPagoParams,
  OperacionPagoRespuesta,
  ReseniarBody,
  UsuarioRespuesta,
} from "../schemas/compras.js";
import { ReseniaRespuesta } from "../schemas/eventos.js";
import { PerfilBody } from "../schemas/auth.js";
import { PagoBody, TarjetaBody, TarjetaParams, TarjetaRespuesta } from "../schemas/tarjetas.js";

// Todas las rutas de este archivo requieren un usuario autenticado.
export function comprasRoutes(controller, autenticado, idempotencia) {
  const router = Router();
  router.use(autenticado);
  const porId = validar({ params: CompraIdParams });

  router.post(
    "/",
    validar({ body: CrearCompraBody, headers: IdempotenciaHeaders }),
    idempotencia,
    controller.crear,
  );
  router.get("/", validar({ query: FiltroEstadoQuery }), controller.misCompras);
  router.get("/:id", porId, controller.detalle);
  router.post(
    "/:id/pago",
    validar({ params: CompraIdParams, body: PagoBody, headers: IdempotenciaHeaders }),
    idempotencia,
    controller.pagar,
  );
  router.get("/:id/pago/:operacionId", validar({ params: OperacionPagoParams }), controller.operacionPago);
  router.post(
    "/:id/cancelacion",
    validar({ params: CompraIdParams, headers: IdempotenciaHeaders }),
    idempotencia,
    controller.cancelar,
  );
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
  router.get("/me/tarjetas", controller.tarjetas);
  router.post("/me/tarjetas", validar({ body: TarjetaBody }), controller.agregarTarjeta);
  router.delete("/me/tarjetas/:tarjetaId", validar({ params: TarjetaParams }), controller.quitarTarjeta);
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

function accion(registro, { path, summary, description, responses = {}, body, headers }) {
  registro.registerPath({
    method: "post",
    path,
    tags: ["Compras"],
    summary,
    description,
    security: SEGURIDAD,
    request: {
      params: CompraIdParams,
      ...(headers && { headers }),
      ...(body && { body: { content: { "application/json": { schema: body } } } }),
    },
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
      "Crea la compra en estado PENDIENTE y reserva el cupo hasta `reservaVenceEn`: si no se paga, el sistema la cancela y libera las entradas. No se puede superar el cupo disponible ni comprar entradas de un evento propio o ya realizado. Un reintento con la misma `Idempotency-Key` devuelve la respuesta original, aunque la compra haya cambiado después (por ejemplo, si venció): el estado actual se consulta en GET /api/compras/{id}.",
    security: SEGURIDAD,
    request: {
      headers: IdempotenciaHeadersDoc,
      body: { content: { "application/json": { schema: CrearCompraBody } } },
    },
    responses: {
      201: respuestaJson("Compra creada", CompraDetalle),
      400: respuestaError("Datos inválidos o tipo de entrada que no es del evento"),
      401: respuestaError("No autenticado"),
      404: respuestaError("El evento no existe"),
      409: respuestaError(
        "Sin cupo (SIN_CUPO), evento finalizado o evento propio, operación en curso (OPERACION_EN_CURSO) o clave usada con otros datos (CLAVE_IDEMPOTENCIA_REUTILIZADA)",
      ),
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

  registro.registerPath({
    method: "post",
    path: "/api/compras/{id}/pago",
    tags: ["Compras"],
    summary: "Iniciar el pago de una compra pendiente",
    description:
      "Registra el intento de cobro con una tarjeta guardada del comprador y responde enseguida: la pasarela (simulada) lo resuelve después. El resultado se consulta con polling en GET /api/compras/{id}/pago/{operacionId}. La compra sigue PENDIENTE y pasa a CONFIRMADA recién cuando la operación queda APROBADA. Mientras tanto no se puede iniciar otro pago ni cancelarla. Pasada `reservaVenceEn` se sigue aceptando el pedido mientras el sistema no haya cancelado la reserva (entre 1 y 2 minutos de margen): es el pago que venía en camino.",
    security: SEGURIDAD,
    request: {
      params: CompraIdParams,
      headers: IdempotenciaHeadersDoc,
      body: { content: { "application/json": { schema: PagoBody } } },
    },
    responses: {
      202: respuestaJson("Pago en proceso. El header Location apunta a la operación", OperacionPagoRespuesta),
      400: respuestaError("Falta la tarjeta o la clave de idempotencia es inválida"),
      ...ERRORES_COMPRA,
      404: respuestaError("La compra no existe o la tarjeta no es del comprador"),
      409: respuestaError(
        "La compra no se puede pagar, la reserva ya fue cancelada por vencer (RESERVA_VENCIDA), ya hay un pago en proceso (PAGO_EN_PROCESO), la clave se está usando (OPERACION_EN_CURSO) o se usó con otros datos (CLAVE_IDEMPOTENCIA_REUTILIZADA)",
      ),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/api/compras/{id}/pago/{operacionId}",
    tags: ["Compras"],
    summary: "Consultar el resultado de un pago",
    description:
      "Para hacer polling después de iniciar el pago. Termina en APROBADA o RECHAZADA; si se rechazó, `motivo` lo explica (PAGO_RECHAZADO o PASARELA_NO_DISPONIBLE). Solo la ve el comprador.",
    security: SEGURIDAD,
    request: { params: OperacionPagoParams },
    responses: {
      200: respuestaJson("Estado de la operación", OperacionPagoRespuesta),
      401: respuestaError("No autenticado"),
      403: respuestaError("La compra no es del usuario"),
      404: respuestaError("La compra o la operación no existen"),
    },
  });

  accion(registro, {
    path: "/api/compras/{id}/cancelacion",
    summary: "Cancelar una compra (CU7, CU8)",
    description:
      "Solo el comprador, si la compra no está UTILIZADA, el evento no se realizó y no hay un pago en proceso. Si estaba pagada se reembolsa y queda REEMBOLSADA. Si el reembolso falla responde 503 y la compra queda CANCELADA: repetir la request lo reintenta.",
    headers: IdempotenciaHeadersDoc,
    responses: {
      503: respuestaError("La pasarela de pagos no responde (PASARELA_NO_DISPONIBLE)"),
    },
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

  const ERRORES_TARJETA = { 401: respuestaError("No autenticado") };
  registro.registerPath({
    method: "get",
    path: "/api/usuarios/me/tarjetas",
    tags: ["Usuarios"],
    summary: "Mis medios de pago",
    security: SEGURIDAD,
    responses: { 200: respuestaJson("Tarjetas", z.array(TarjetaRespuesta)), ...ERRORES_TARJETA },
  });

  registro.registerPath({
    method: "post",
    path: "/api/usuarios/me/tarjetas",
    tags: ["Usuarios"],
    summary: "Guardar una tarjeta",
    description:
      "La pasarela (simulada) la tokeniza. Solo se guardan la marca, los últimos 4 dígitos, el vencimiento y el titular; el número completo y el código no se guardan nunca.",
    security: SEGURIDAD,
    request: { body: { content: { "application/json": { schema: TarjetaBody } } } },
    responses: {
      201: respuestaJson("Tarjeta guardada", TarjetaRespuesta),
      400: respuestaError("Datos inválidos o tarjeta vencida"),
      ...ERRORES_TARJETA,
      503: respuestaError("La pasarela de pagos no responde (PASARELA_NO_DISPONIBLE)"),
    },
  });

  registro.registerPath({
    method: "delete",
    path: "/api/usuarios/me/tarjetas/{tarjetaId}",
    tags: ["Usuarios"],
    summary: "Quitar una tarjeta",
    security: SEGURIDAD,
    request: { params: TarjetaParams },
    responses: {
      204: { description: "Tarjeta quitada" },
      ...ERRORES_TARJETA,
      404: respuestaError("La tarjeta no existe o no es tuya"),
    },
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
