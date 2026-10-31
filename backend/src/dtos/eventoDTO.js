export function usuarioResumenDTO(usuario) {
  return { id: usuario.id, nombre: usuario.nombreCompleto() };
}

export function categoriaDTO(categoria) {
  return { id: categoria.id, nombre: categoria.nombre, descripcion: categoria.descripcion };
}

function tipoEntradaDTO(tipo) {
  return {
    id: tipo.id,
    nombre: tipo.nombre,
    descripcion: tipo.descripcion,
    precio: tipo.precio,
    cupo: tipo.cupo,
    disponibles: tipo.disponibles(),
  };
}

function organizadorDTO(organizador, reputacion) {
  return { ...usuarioResumenDTO(organizador), ...reputacion };
}

function agotado(evento) {
  return evento.tiposEntrada.every((tipo) => tipo.disponibles() === 0);
}

// Versión liviana para listados (búsqueda, favoritos).
export function eventoResumenDTO(evento, reputacion) {
  return {
    id: evento.id,
    nombre: evento.nombre,
    categoria: { id: evento.categoria.id, nombre: evento.categoria.nombre },
    fecha: evento.fecha.toISOString(),
    lugar: evento.lugar,
    imagen: evento.multimedia[0] ?? null,
    precioDesde: evento.precioDesde(),
    agotado: agotado(evento),
    organizador: organizadorDTO(evento.organizador, reputacion),
  };
}

export function reseniaDTO(resenia) {
  return {
    id: resenia.id,
    puntuacion: resenia.puntuacion,
    detalle: resenia.detalle,
    fecha: resenia.fecha.toISOString(),
    comprador: { id: resenia.comprador.id, nombre: resenia.comprador.nombre },
    evento: { id: resenia.evento.id, nombre: resenia.evento.nombre },
  };
}

export function eventoDetalleDTO({ evento, reputacion, reseniasRecientes }) {
  return {
    ...eventoResumenDTO(evento, reputacion),
    descripcion: evento.descripcion,
    multimedia: evento.multimedia,
    tiposEntrada: evento.tiposEntrada.map(tipoEntradaDTO),
    reseniasRecientes: reseniasRecientes.map(reseniaDTO),
  };
}

// Vista del organizador sobre sus propios eventos, con el avance de las ventas.
export function eventoDeOrganizadorDTO(evento) {
  const cupo = evento.tiposEntrada.reduce((total, tipo) => total + tipo.cupo, 0);
  const vendidas = evento.tiposEntrada.reduce((total, tipo) => total + tipo.vendidas, 0);
  return {
    id: evento.id,
    nombre: evento.nombre,
    fecha: evento.fecha.toISOString(),
    lugar: evento.lugar,
    imagen: evento.multimedia[0] ?? null,
    categoria: { id: evento.categoria.id, nombre: evento.categoria.nombre },
    cupoTotal: cupo,
    vendidas,
    disponibles: cupo - vendidas,
  };
}
