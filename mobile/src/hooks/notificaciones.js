import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/endpoints";

// La burbuja de la barra se actualiza sola cada 15 segundos (y al volver a la app, con el focusManager).
export const INTERVALO_RESUMEN_MS = 15_000;
const POR_PAGINA = 20;

const CLAVE = ["notificaciones"];
const CLAVE_RESUMEN = ["notificaciones", "resumen"];
const CLAVE_LISTA = ["notificaciones", "lista"];

export function useResumenNotificaciones() {
  return useQuery({
    queryKey: CLAVE_RESUMEN,
    queryFn: ({ signal }) => api.notificaciones.resumen({ signal }),
    refetchInterval: INTERVALO_RESUMEN_MS,
  });
}

// La más reciente primero (así las ordena la API), de a 20 con scroll infinito.
export function useNotificaciones() {
  return useInfiniteQuery({
    queryKey: CLAVE_LISTA,
    queryFn: ({ pageParam, signal }) =>
      api.notificaciones.listar({ page: pageParam, pageSize: POR_PAGINA }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.page * ultima.pageSize < ultima.total ? ultima.page + 1 : undefined,
  });
}

// Marca como leídas, en la lista en caché, las que cumplen `debeMarcar`. Devuelve cuántas estaban sin leer.
function marcarEnLaLista(queryClient, debeMarcar) {
  let marcadas = 0;
  queryClient.setQueryData(CLAVE_LISTA, (lista) => {
    if (!lista) return lista;
    return {
      ...lista,
      pages: lista.pages.map((pagina) => ({
        ...pagina,
        data: pagina.data.map((n) => {
          if (n.leida || !debeMarcar(n)) return n;
          marcadas += 1;
          return { ...n, leida: true };
        }),
      })),
    };
  });
  return marcadas;
}

// Actualización optimista: la notificación se ve leída y la burbuja baja al instante. Si la API falla, se
// vuelve a lo que había; al terminar, siempre se pide lo que dice el servidor.
function useMarcarOptimista({ mutationFn, debeMarcar, noLeidasDespues }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: CLAVE });
      const anteriores = {
        lista: queryClient.getQueryData(CLAVE_LISTA),
        resumen: queryClient.getQueryData(CLAVE_RESUMEN),
      };
      const marcadas = marcarEnLaLista(queryClient, (n) => debeMarcar(n, variables));
      queryClient.setQueryData(
        CLAVE_RESUMEN,
        (resumen) => resumen && { noLeidas: noLeidasDespues(resumen.noLeidas, marcadas) },
      );
      return anteriores;
    },
    onError: (_error, _variables, anteriores) => {
      queryClient.setQueryData(CLAVE_LISTA, anteriores.lista);
      queryClient.setQueryData(CLAVE_RESUMEN, anteriores.resumen);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CLAVE }),
  });
}

export function useMarcarLeida() {
  return useMarcarOptimista({
    mutationFn: (id) => api.notificaciones.marcarLeida(id),
    debeMarcar: (n, id) => n.id === id,
    noLeidasDespues: (noLeidas, marcadas) => Math.max(0, noLeidas - marcadas),
  });
}

// Marca también las que no se cargaron todavía (las de páginas siguientes): la burbuja queda en cero.
export function useMarcarTodasLeidas() {
  return useMarcarOptimista({
    mutationFn: () => api.notificaciones.marcarLeidas(),
    debeMarcar: () => true,
    noLeidasDespues: () => 0,
  });
}

// Al abrir el chat de una compra: lo que se avisaba de esa compra ya se está viendo. Sin optimismo: no hay
// nada en pantalla que cambiar, solo la burbuja, que se pide de nuevo si se marcó alguna.
export function useMarcarLeidasDeCompra(compraId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.notificaciones.marcarLeidas({ compraId }),
    onSuccess: ({ marcadas }) => {
      if (marcadas > 0) queryClient.invalidateQueries({ queryKey: CLAVE });
    },
  });
}
