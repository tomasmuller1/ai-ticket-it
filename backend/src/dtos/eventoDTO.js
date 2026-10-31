export function eventoToDTO(evento) {
  return {
    id: evento.id,
    titulo: evento.titulo,
    descripcion: evento.descripcion,
    categoria: evento.categoria,
    fecha: evento.fecha,
    lugar: evento.lugar,
    organizadorId: evento.organizadorId,
    precioDesde: evento.precioDesde(),
    tiposEntrada: evento.tiposEntrada.map((tipo) => ({
      id: tipo.id,
      nombre: tipo.nombre,
      precio: tipo.precio,
      disponibles: tipo.disponibles(),
    })),
  };
}
