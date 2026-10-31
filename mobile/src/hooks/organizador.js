import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/endpoints";

export function useMisEventos() {
  return useQuery({ queryKey: ["eventos", "mios"], queryFn: api.eventos.mios });
}

// CU2: compras de un evento con el resumen de vendidas y disponibles por tipo.
export function useComprasDeEvento(eventoId, estado) {
  return useQuery({
    queryKey: ["eventos", eventoId, "compras", estado ?? "todas"],
    queryFn: () => api.eventos.compras(eventoId, estado),
  });
}

// CU4: al crear, se invalidan los listados para que el evento aparezca en Explorar y en Mis eventos.
export function useCrearEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.eventos.crear,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eventos"] }),
  });
}
