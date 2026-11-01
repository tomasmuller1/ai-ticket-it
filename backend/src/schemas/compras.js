import { Compra } from "../domain/Compra.js";
import { EstadoCompra } from "../domain/estados/EstadoCompra.js";
import { Mensaje } from "../domain/Mensaje.js";
import { Resenia } from "../domain/Resenia.js";
import { EventoIdParams, EventoResumen } from "./eventos.js";
import { z } from "./zod.js";

const UsuarioResumen = z.object({ id: z.string(), nombre: z.string() });
const fecha = z.string().openapi({ format: "date-time" });

export const CompraIdParams = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: "id", in: "path" }, example: "c-01" }),
});

export const FiltroEstadoQuery = z.object({
  estado: z.enum(Object.values(EstadoCompra)).optional(),
});

export const CrearCompraBody = z
  .object({
    eventoId: z.string().min(1).openapi({ example: "e-rock-nacional" }),
    tipoEntradaId: z.string().min(1).openapi({ example: "e-rock-nacional-campo" }),
    cantidad: z.number().int().min(1).max(Compra.CANTIDAD_MAXIMA).openapi({ example: 2 }),
  })
  .openapi("CrearCompra");

export const MensajesQuery = z.object({
  desde: z.iso
    .datetime({ offset: true })
    .transform((valor) => new Date(valor))
    .optional()
    .openapi({ description: "Devuelve solo los mensajes enviados después de esta fecha" }),
});

export const EnviarMensajeBody = z
  .object({
    mensaje: z.string().trim().min(1).max(Mensaje.LARGO_MAXIMO).openapi({ example: "¿Hay estacionamiento?" }),
  })
  .openapi("EnviarMensaje");

export const ReseniarBody = z
  .object({
    puntuacion: z
      .number()
      .int()
      .min(Resenia.PUNTUACION_MINIMA)
      .max(Resenia.PUNTUACION_MAXIMA)
      .openapi({ example: 5 }),
    detalle: z
      .string()
      .trim()
      .max(Resenia.LARGO_MAXIMO_DETALLE)
      .default("")
      .openapi({ example: "¡Excelente show!" }),
  })
  .openapi("Reseniar");

export const CompraRespuesta = z
  .object({
    id: z.string(),
    estado: z.enum(Object.values(EstadoCompra)),
    cantidad: z.number().int(),
    precioUnitario: z.number(),
    total: z.number(),
    fechaCreacion: fecha,
    diasRestantes: z.number().int().nullable().openapi({ description: "Solo para compras CONFIRMADAS" }),
    evento: z.object({
      id: z.string(),
      nombre: z.string(),
      fecha,
      lugar: z.string(),
      imagen: z.string().nullable(),
      organizador: UsuarioResumen,
    }),
    tipoEntrada: z.object({ id: z.string(), nombre: z.string() }),
    comprador: UsuarioResumen,
    acciones: z
      .object({
        pagar: z.boolean(),
        cancelar: z.boolean(),
        validar: z.boolean(),
        reseniar: z.boolean(),
        chatear: z.boolean(),
        reintentarReembolso: z.boolean(),
      })
      .openapi({ description: "Qué puede hacer el usuario autenticado con esta compra ahora" }),
    resenia: z.object({ puntuacion: z.number().int(), detalle: z.string() }).nullable(),
  })
  .openapi("Compra");

export const CompraDetalle = CompraRespuesta.extend({
  codigoEntrada: z.string().openapi({ example: "3F9A1C2B" }),
  cantidadMensajes: z.number().int(),
  historial: z.array(
    z.object({
      estado: z.enum(Object.values(EstadoCompra)),
      quien: UsuarioResumen.nullable(),
      fechaHora: fecha,
    }),
  ),
}).openapi("CompraDetalle");

export const MensajeRespuesta = z
  .object({
    id: z.string(),
    mensaje: z.string(),
    enviado: fecha,
    autor: UsuarioResumen,
    esPropio: z.boolean(),
  })
  .openapi("Mensaje");

export const ComprasDeEvento = z
  .object({
    evento: z.object({ id: z.string(), nombre: z.string(), fecha }),
    resumenPorTipo: z.array(
      z.object({
        tipoEntradaId: z.string(),
        nombre: z.string(),
        precio: z.number(),
        cupo: z.number().int(),
        vendidas: z.number().int(),
        disponibles: z.number().int(),
      }),
    ),
    compras: z.array(CompraRespuesta),
  })
  .openapi("ComprasDeEvento");

export const UsuarioRespuesta = z
  .object({
    id: z.string(),
    nombre: z.string(),
    apellido: z.string(),
    email: z.string(),
    tieneContrasenia: z.boolean().openapi({
      description: "false en cuentas creadas con Google que todavía no eligieron una contraseña",
    }),
  })
  .openapi("Usuario");

export const FavoritoParams = z.object({
  eventoId: z
    .string()
    .min(1)
    .openapi({ param: { name: "eventoId", in: "path" }, example: "e-festival" }),
});

export { EventoIdParams, EventoResumen };
