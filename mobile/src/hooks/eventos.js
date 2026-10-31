import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/endpoints";

const POR_PAGINA = 10;

// CU3 y CU11: búsqueda paginada con scroll infinito. Cada combinación de filtros es su propia caché.
export function useBusquedaEventos(filtros) {
  return useInfiniteQuery({
    queryKey: ["eventos", "busqueda", filtros],
    queryFn: ({ pageParam }) => api.eventos.buscar({ ...filtros, page: pageParam, pageSize: POR_PAGINA }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.page * ultima.pageSize < ultima.total ? ultima.page + 1 : undefined),
  });
}

export function useEvento(id) {
  return useQuery({ queryKey: ["eventos", id], queryFn: () => api.eventos.detalle(id) });
}

export function useCategorias() {
  // Las categorías casi no cambian: se piden una vez por sesión.
  return useQuery({ queryKey: ["categorias"], queryFn: api.categorias.listar, staleTime: Infinity });
}

export function useFavoritos() {
  return useQuery({ queryKey: ["favoritos"], queryFn: api.usuarios.favoritos });
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
