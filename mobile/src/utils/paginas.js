// Las listas paginadas de la API responden { data, page, pageSize, total }. Con `useInfiniteQuery`, la caché
// guarda una página por pedido: estos dos ayudantes sirven para todas.
export const siguientePagina = (ultima) =>
  ultima.page * ultima.pageSize < ultima.total ? ultima.page + 1 : undefined;

export const itemsDe = (paginas) => paginas?.pages.flatMap((pagina) => pagina.data) ?? [];

export const totalDe = (paginas) => paginas?.pages[0]?.total ?? 0;
