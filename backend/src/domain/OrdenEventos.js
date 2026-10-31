// Patrón Strategy: cada criterio de orden sabe qué valor comparar de un evento.
// Agregar un criterio nuevo es sumar una entrada acá, sin tocar el algoritmo de ordenamiento.
export const estrategiasDeOrden = {
  fecha: { valor: (evento) => evento.fecha.getTime() },
  precio: { valor: (evento) => evento.precioDesde() },
  puntaje: { valor: (evento, { reputaciones }) => reputaciones.get(evento.organizador.id)?.puntaje ?? null },
};

export const CRITERIOS_DE_ORDEN = Object.keys(estrategiasDeOrden);

// Los valores null (por ejemplo, organizadores sin reseñas) van siempre al final.
// Ante un empate se desempata por fecha, para que el orden sea estable y predecible.
export function ordenarEventos(eventos, { orden = "fecha", dir = "asc" }, contexto = {}) {
  const { valor } = estrategiasDeOrden[orden];
  const signo = dir === "desc" ? -1 : 1;
  return [...eventos].sort((a, b) => {
    const va = valor(a, contexto);
    const vb = valor(b, contexto);
    if (va === null || vb === null) {
      if (va === vb) return a.fecha - b.fecha;
      return va === null ? 1 : -1;
    }
    return (va - vb) * signo || a.fecha - b.fecha;
  });
}
