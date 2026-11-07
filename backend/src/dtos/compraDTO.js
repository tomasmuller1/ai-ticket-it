import { EstadoCompra } from "../domain/estados/EstadoCompra.js";
import { usuarioResumenDTO } from "./eventoDTO.js";

function quienDTO(usuario) {
  return usuario ? usuarioResumenDTO(usuario) : null;
}

// Código corto y legible para mostrar en la entrada (y, más adelante, en un QR).
function codigoEntrada(compra) {
  return compra.id.replaceAll("-", "").slice(0, 8).toUpperCase();
}

export function operacionPagoDTO(operacion) {
  return {
    operacionId: operacion.id,
    compraId: operacion.compraId,
    estado: operacion.estado,
    motivo: operacion.motivo,
    fechaCreacion: operacion.fechaCreacion.toISOString(),
    fechaResolucion: operacion.fechaResolucion?.toISOString() ?? null,
  };
}

export function compraDTO(compra, usuario, reloj) {
  const { evento } = compra;
  return {
    id: compra.id,
    estado: compra.estado,
    cantidad: compra.cantidad,
    precioUnitario: compra.precioUnitario,
    total: compra.total,
    fechaCreacion: compra.fechaCreacion.toISOString(),
    reservaVenceEn: compra.estado === EstadoCompra.PENDIENTE ? (compra.venceEn?.toISOString() ?? null) : null,
    reservaVencida: compra.reservaVencida(reloj),
    diasRestantes: compra.diasRestantes(reloj),
    evento: {
      id: evento.id,
      nombre: evento.nombre,
      fecha: evento.fecha.toISOString(),
      lugar: evento.lugar,
      imagen: evento.multimedia[0] ?? null,
      organizador: usuarioResumenDTO(evento.organizador),
    },
    tipoEntrada: { id: compra.tipoEntrada.id, nombre: compra.tipoEntrada.nombre },
    comprador: usuarioResumenDTO(compra.comprador),
    acciones: compra.accionesPermitidas(usuario, reloj),
    // Información de pago: solo la ve el comprador. Permite retomar la espera si la app se cerró.
    operacionPago:
      compra.operacionPago && compra.esComprador(usuario) ? operacionPagoDTO(compra.operacionPago) : null,
    resenia: compra.resenia
      ? { puntuacion: compra.resenia.puntuacion, detalle: compra.resenia.detalle }
      : null,
  };
}

export function compraDetalleDTO(compra, usuario, reloj) {
  return {
    ...compraDTO(compra, usuario, reloj),
    codigoEntrada: codigoEntrada(compra),
    cantidadMensajes: compra.mensajes.length,
    historial: compra.historial.map((cambio) => ({
      estado: cambio.estado,
      quien: quienDTO(cambio.quien),
      fechaHora: cambio.fechaHora.toISOString(),
    })),
  };
}

export function mensajeDTO(mensaje, usuario) {
  return {
    id: mensaje.id,
    mensaje: mensaje.mensaje,
    enviado: mensaje.enviado.toISOString(),
    autor: usuarioResumenDTO(mensaje.usuario),
    esPropio: mensaje.usuario.es(usuario),
  };
}

// CU2: por cada tipo de entrada, cuántas se vendieron y cuántas quedan.
export function comprasDeEventoDTO({ evento, compras }, usuario, reloj) {
  return {
    evento: { id: evento.id, nombre: evento.nombre, fecha: evento.fecha.toISOString() },
    resumenPorTipo: evento.tiposEntrada.map((tipo) => ({
      tipoEntradaId: tipo.id,
      nombre: tipo.nombre,
      precio: tipo.precio,
      cupo: tipo.cupo,
      vendidas: tipo.vendidas,
      disponibles: tipo.disponibles(),
    })),
    compras: compras.map((compra) => compraDTO(compra, usuario, reloj)),
  };
}

export function usuarioDTO(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    tieneContrasenia: usuario.tieneContrasenia(),
  };
}
