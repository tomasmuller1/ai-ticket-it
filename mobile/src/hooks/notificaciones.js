import {
  useInfiniteQuery,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "../api/endpoints";

// La burbuja de la barra se actualiza sola cada 15 segundos (y al volver a la app, con el focusManager).
export const INTERVALO_RESUMEN_MS = 15_000;
const POR_PAGINA = 20;

const CLAVE = ["notificaciones"];
const CLAVE_RESUMEN = ["notificaciones", "resumen"];
const CLAVE_LISTA = ["notificaciones", "lista"];
// Las lecturas optimistas comparten clave para saber si hay otra en vuelo.
const CLAVE_LECTURA = ["notificaciones", "lectura"];

// Cada observer con `refetchInterval` tiene su propio reloj: si la pantalla también lo pidiera, el resumen
// saldría dos veces por intervalo. La barra lo consulta; quien solo lo lee pasa `periodico: false`.
export function useResumenNotificaciones({ periodico = true } = {}) {
  return useQuery({
    queryKey: CLAVE_RESUMEN,
    queryFn: ({ signal }) => api.notificaciones.resumen({ signal }),
    refetchInterval: periodico ? INTERVALO_RESUMEN_MS : false,
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

// Si hay una lectura optimista en vuelo (tocar una notificación o "Marcar todas"). Mientras tanto, lo que
// responda el servidor puede traer sin leer lo que se está marcando: la lectura lo pide al terminar.
export function useLecturaEnCurso() {
  return useIsMutating({ mutationKey: CLAVE_LECTURA }) > 0;
}

// Cambia en la lista en caché las notificaciones que cumplen `debeCambiar`. Devuelve los ids que cambió.
function cambiarEnLaLista(queryClient, debeCambiar, leida) {
  const cambiadas = [];
  queryClient.setQueryData(CLAVE_LISTA, (lista) => {
    if (!lista) return lista;
    return {
      ...lista,
      pages: lista.pages.map((pagina) => ({
        ...pagina,
        data: pagina.data.map((n) => {
          if (n.leida === leida || !debeCambiar(n)) return n;
          cambiadas.push(n.id);
          return { ...n, leida };
        }),
      })),
    };
  });
  return cambiadas;
}

// Actualización optimista: la notificación se ve leída y la burbuja baja al instante. Puede haber varias en
// vuelo (tocar dos seguidas, o una y "Marcar todas"):
// - si una falla, deshace solo lo suyo: volver a una foto de antes borraría lo que marcó otra mientras tanto;
// - lo que dice el servidor lo pide solo la última en terminar: si lo pidiera otra antes, la respuesta traería
//   sin leer lo que esta todavía está marcando. En `onSettled` la propia mutación todavía cuenta como en vuelo.
function useMarcarOptimista({ mutationFn, debeMarcar, noLeidasDespues }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CLAVE_LECTURA,
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: CLAVE });
      const marcadas = cambiarEnLaLista(queryClient, (n) => debeMarcar(n, variables), true);
      let descontadas = 0;
      queryClient.setQueryData(CLAVE_RESUMEN, (resumen) => {
        if (!resumen) return resumen;
        const noLeidas = noLeidasDespues(resumen.noLeidas, marcadas.length);
        descontadas = resumen.noLeidas - noLeidas;
        return { noLeidas };
      });
      return { marcadas, descontadas };
    },
    onError: (_error, _variables, hecho) => {
      if (!hecho) return;
      const marcadas = new Set(hecho.marcadas);
      cambiarEnLaLista(queryClient, (n) => marcadas.has(n.id), false);
      queryClient.setQueryData(
        CLAVE_RESUMEN,
        (resumen) => resumen && { noLeidas: resumen.noLeidas + hecho.descontadas },
      );
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: CLAVE_LECTURA }) === 1) {
        queryClient.invalidateQueries({ queryKey: CLAVE });
      }
    },
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

// Al abrir el chat de una compra: sus mensajes ya se están viendo (el backend marca solo esos, no los demás
// avisos de la compra). Sin optimismo: no hay nada en pantalla que cambiar, solo la burbuja, que se pide de
// nuevo si se marcó alguna. Si hay una lectura optimista en vuelo, se espera a que esa lo pida al terminar.
export function useMarcarLeidasDeCompra(compraId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.notificaciones.marcarLeidas({ compraId }),
    onSuccess: ({ marcadas }) => {
      if (marcadas > 0 && queryClient.isMutating({ mutationKey: CLAVE_LECTURA }) === 0) {
        queryClient.invalidateQueries({ queryKey: CLAVE });
      }
    },
  });
}
