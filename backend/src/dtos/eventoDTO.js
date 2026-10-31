export function eventoToDTO(evento) {
  return {
    id: evento.id,
    nombre: evento.nombre,
    descripcion: evento.descripcion,
    categoria: { id: evento.categoria.id, nombre: evento.categoria.nombre },
    fecha: evento.fecha.toISOString(),
    lugar: evento.lugar,
    multimedia: evento.multimedia,
    organizador: { id: evento.organizador.id, nombre: evento.organizador.nombreCompleto() },
    precioDesde: evento.precioDesde(),
    tiposEntrada: evento.tiposEntrada.map((tipo) => ({
      id: tipo.id,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion,
      precio: tipo.precio,
      disponibles: tipo.disponibles(),
    })),
  };
}
