import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/endpoints";

const INTERVALO_CHAT_MS = 3000;

export function useMisCompras(estado) {
  return useQuery({ queryKey: ["compras", "mias", estado ?? "todas"], queryFn: () => api.compras.mias(estado) });
}

export function useCompra(id) {
  return useQuery({ queryKey: ["compras", id], queryFn: () => api.compras.detalle(id) });
}

// Después de cualquier cambio en una compra se refrescan las compras y los eventos
// (cambian los disponibles de cada tipo de entrada).
function useInvalidarCompras() {
  const queryClient = useQueryClient();
  return (compra) => {
    if (compra) queryClient.setQueryData(["compras", compra.id], compra);
    queryClient.invalidateQueries({ queryKey: ["compras"] });
    queryClient.invalidateQueries({ queryKey: ["eventos"] });
  };
}

export function useComprar() {
  const invalidar = useInvalidarCompras();
  return useMutation({ mutationFn: api.compras.crear, onSuccess: invalidar });
}

export function useAccionCompra(accion) {
  const invalidar = useInvalidarCompras();
  return useMutation({ mutationFn: (id) => api.compras[accion](id), onSuccess: invalidar });
}

// CU5 y CU6: el chat se actualiza cada 3 segundos mientras la pantalla está abierta.
export function useMensajes(compraId) {
  return useQuery({
    queryKey: ["compras", compraId, "mensajes"],
    queryFn: () => api.compras.mensajes(compraId),
    refetchInterval: INTERVALO_CHAT_MS,
  });
}

export function useEnviarMensaje(compraId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mensaje) => api.compras.enviarMensaje(compraId, mensaje),
    onSuccess: (mensaje) =>
      queryClient.setQueryData(["compras", compraId, "mensajes"], (actuales = []) => [...actuales, mensaje]),
  });
}

export function useReseniar(compraId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos) => api.compras.reseniar(compraId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
    },
  });
}
