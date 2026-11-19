import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "../api/endpoints";
import { itemsDe, siguientePagina } from "../utils/paginas";

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
    getNextPageParam: siguientePagina,
  });
}

// Lo que ya se conoce de un evento por los listados, para no mostrar un skeleton de toda la pantalla.
function resumenEnCache(queryClient, id) {
  const buscados = queryClient
    .getQueriesData({ queryKey: ["eventos", "busqueda"] })
    .flatMap(([, datos]) => itemsDe(datos));
  const favoritos = itemsDe(queryClient.getQueryData(LISTA_FAVORITOS));
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

const LISTA_FAVORITOS = ["favoritos", "lista"];
const IDS_FAVORITOS = ["favoritos", "ids"];

// Los favoritos son solo de los compradores: para un organizador se llama con `enabled: false` (la API
// respondería 403). La lista va paginada, el último guardado primero.
export function useFavoritos({ enabled = true } = {}) {
  return useInfiniteQuery({
    queryKey: LISTA_FAVORITOS,
    queryFn: ({ pageParam, signal }) =>
      api.usuarios.favoritos({ page: pageParam, pageSize: POR_PAGINA }, { signal }),
    initialPageParam: 1,
    getNextPageParam: siguientePagina,
    enabled,
  });
}

// Solo los ids, para marcar el corazón en cualquier listado (Explorar, Favoritos, el detalle) sin pedir
// todos los favoritos.
export function useIdsFavoritos({ enabled = true } = {}) {
  return useQuery({
    queryKey: IDS_FAVORITOS,
    queryFn: ({ signal }) => api.usuarios.idsFavoritos({ signal }),
    select: (ids) => new Set(ids),
    enabled,
  });
}

// Agrega o quita un favorito con actualización optimista: el corazón cambia al instante y, al quitarlo, el
// evento sale de la pestaña Favoritos. Si la API falla, todo vuelve a como estaba.
export function useAlternarFavorito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evento, esFavorito }) =>
      esFavorito ? api.usuarios.quitarFavorito(evento.id) : api.usuarios.agregarFavorito(evento.id),
    onMutate: async ({ evento, esFavorito }) => {
      await queryClient.cancelQueries({ queryKey: ["favoritos"] });
      const anteriores = {
        ids: queryClient.getQueryData(IDS_FAVORITOS),
        lista: queryClient.getQueryData(LISTA_FAVORITOS),
      };
      queryClient.setQueryData(IDS_FAVORITOS, (ids = []) =>
        esFavorito ? ids.filter((id) => id !== evento.id) : [evento.id, ...ids],
      );
      if (esFavorito && anteriores.lista) {
        const estaba = itemsDe(anteriores.lista).some((e) => e.id === evento.id);
        queryClient.setQueryData(LISTA_FAVORITOS, (lista) => ({
          ...lista,
          pages: lista.pages.map((pagina) => ({
            ...pagina,
            data: pagina.data.filter((e) => e.id !== evento.id),
            total: estaba ? pagina.total - 1 : pagina.total,
          })),
        }));
      }
      return { anteriores };
    },
    onError: (_error, _variables, contexto) => {
      queryClient.setQueryData(IDS_FAVORITOS, contexto.anteriores.ids);
      queryClient.setQueryData(LISTA_FAVORITOS, contexto.anteriores.lista);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["favoritos"] }),
  });
}
