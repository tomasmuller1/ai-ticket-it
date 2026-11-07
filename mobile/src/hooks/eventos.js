import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "../api/endpoints";

const POR_PAGINA = 10;

// CU3 y CU11: búsqueda paginada con scroll infinito. Cada combinación de filtros es su propia caché; al
// cambiarlos se mantiene la lista anterior hasta tener la nueva, para que no parpadee.
export function useBusquedaEventos(filtros) {
  return useInfiniteQuery({
    queryKey: ["eventos", "busqueda", filtros],
    queryFn: ({ pageParam, signal }) =>
      api.eventos.buscar({ ...filtros, page: pageParam, pageSize: POR_PAGINA }, { signal }),
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.page * ultima.pageSize < ultima.total ? ultima.page + 1 : undefined,
  });
}

// Lo que ya se conoce de un evento por los listados, para no mostrar un skeleton de toda la pantalla.
function resumenEnCache(queryClient, id) {
  const buscados = queryClient
    .getQueriesData({ queryKey: ["eventos", "busqueda"] })
    .flatMap(([, datos]) => datos?.pages.flatMap((pagina) => pagina.data) ?? []);
  const favoritos = queryClient.getQueryData(["favoritos"]) ?? [];
  return [...buscados, ...favoritos].find((evento) => evento.id === id);
}

// Mientras `isPlaceholderData` sea true, `data` es el resumen del listado: faltan la descripción, los tipos
// de entrada y las reseñas.
export function useEvento(id) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["eventos", id],
    queryFn: ({ signal }) => api.eventos.detalle(id, { signal }),
    placeholderData: () => resumenEnCache(queryClient, id),
  });
}

// Al comprar, un atraso de 30 s importa si quedan pocas entradas: se muestra lo que hay en caché y siempre
// se piden los disponibles.
export function useEventoParaComprar(id) {
  return useQuery({
    queryKey: ["eventos", id],
    queryFn: ({ signal }) => api.eventos.detalle(id, { signal }),
    staleTime: 0,
  });
}

export function useCategorias() {
  // Las categorías casi no cambian: se piden una vez por sesión.
  return useQuery({
    queryKey: ["categorias"],
    queryFn: ({ signal }) => api.categorias.listar({ signal }),
    staleTime: Infinity,
  });
}

export function useFavoritos() {
  return useQuery({ queryKey: ["favoritos"], queryFn: ({ signal }) => api.usuarios.favoritos({ signal }) });
}

// Agrega o quita un favorito con actualización optimista: el corazón cambia al instante.
export function useAlternarFavorito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evento, esFavorito }) =>
      esFavorito ? api.usuarios.quitarFavorito(evento.id) : api.usuarios.agregarFavorito(evento.id),
    onMutate: async ({ evento, esFavorito }) => {
      await queryClient.cancelQueries({ queryKey: ["favoritos"] });
      const anteriores = queryClient.getQueryData(["favoritos"]);
      queryClient.setQueryData(["favoritos"], (actuales = []) =>
        esFavorito ? actuales.filter((e) => e.id !== evento.id) : [...actuales, evento],
      );
      return { anteriores };
    },
    onError: (_error, _variables, contexto) => queryClient.setQueryData(["favoritos"], contexto.anteriores),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["favoritos"] }),
  });
}
