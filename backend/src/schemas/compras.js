import { Compra } from "../domain/Compra.js";
import { EstadoCompra } from "../domain/estados/EstadoCompra.js";
import { EstadoOperacionPago } from "../domain/OperacionPago.js";
import { Mensaje } from "../domain/Mensaje.js";
import { Resenia } from "../domain/Resenia.js";
import { EstadoEvento } from "../domain/Evento.js";
import { EventoIdParams, EventoResumen } from "./eventos.js";
import { z } from "./zod.js";

const UsuarioResumen = z.object({ id: z.string(), nombre: z.string() });
const fecha = z.string().openapi({ format: "date-time" });

export const OperacionPagoRespuesta = z
  .object({
    operacionId: z.string(),
    compraId: z.string(),
    estado: z.enum(Object.values(EstadoOperacionPago)).openapi({
      description: "PENDIENTE mientras la pasarela procesa el cobro; APROBADA o RECHAZADA al resolverse",
    }),
    motivo: z
      .object({
        codigo: z.string().openapi({ example: "PAGO_RECHAZADO" }),
        mensaje: z.string(),
      })
      .nullable()
      .openapi({ description: "Por qué se rechazó: PAGO_RECHAZADO o PASARELA_NO_DISPONIBLE" }),
    fechaCreacion: fecha,
    fechaResolucion: fecha.nullable(),
  })
  .openapi("OperacionPago");

export const CompraIdParams = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: "id", in: "path" }, example: "c-01" }),
});

export const OperacionPagoParams = CompraIdParams.extend({
  operacionId: z
    .string()
    .min(1)
    .openapi({ param: { name: "operacionId", in: "path" }, example: "3f9a1c2b-7a10-4a55-9d3c-1b2c3d4e5f60" }),
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
    reservaVenceEn: fecha.nullable().openapi({
      description: "Hasta cuándo se puede pagar la reserva. Solo si la compra está PENDIENTE y tiene plazo",
    }),
    reservaPlazoCumplido: z.boolean().openapi({
      description:
        "Pasó `reservaVenceEn`, la compra sigue PENDIENTE y no hay un pago en proceso. Ya no se ofrece pagar, pero la reserva todavía no se canceló: el cupo no se liberó y un `POST /pago` que venía en camino se acepta. El sistema la cancela entre 1 y 2 minutos después de esa hora. Un rechazo del pago extiende el plazo y vuelve a false",
    }),
    reservaVencida: z.boolean().openapi({
      description:
        "El sistema canceló la reserva porque no se pagó a tiempo: la compra está CANCELADA y las entradas se liberaron. Mientras siga PENDIENTE es false, aunque haya pasado `reservaVenceEn` (para eso está `reservaPlazoCumplido`). Una cancelación hecha por la persona tampoco cuenta",
    }),
    diasRestantes: z.number().int().nullable().openapi({
      description:
        "Solo para compras CONFIRMADAS: días de calendario que faltan para el evento, en la hora de Argentina. Es 0 si falta menos de 24 h (para eso está `minutosRestantes`) o si ya empezó",
    }),
    minutosRestantes: z.number().int().nullable().openapi({
      description:
        "Solo para compras CONFIRMADAS: minutos que faltan para el evento, redondeados para arriba (0 si ya empezó). Con `diasRestantes` en 0, la app muestra las horas o los minutos",
    }),
    evento: z.object({
      id: z.string(),
      nombre: z.string(),
      fecha,
      lugar: z.string(),
      imagen: z.string().nullable(),
      estado: z.enum(Object.values(EstadoEvento)),
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
      .openapi({
        description:
          "Qué puede hacer el usuario autenticado con esta compra ahora. `pagar` es false desde `reservaVenceEn`, aunque la compra siga PENDIENTE",
      }),
    operacionPago: OperacionPagoRespuesta.nullable().openapi({
      description: "El último intento de pago. Solo lo ve el comprador",
    }),
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
    evento: z.object({
      id: z.string(),
      nombre: z.string(),
      fecha,
      estado: z.enum(Object.values(EstadoEvento)),
      finalizado: z.boolean(),
    }),
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
