export function notificacionDTO(notificacion) {
  return {
    id: notificacion.id,
    tipo: notificacion.tipo,
    titulo: notificacion.titulo,
    cuerpo: notificacion.cuerpo,
    fechaHora: notificacion.fechaHora.toISOString(),
    leida: notificacion.leida,
    evento: { id: notificacion.evento.id, nombre: notificacion.evento.nombre },
    compraId: notificacion.compra?.id ?? null,
  };
}
