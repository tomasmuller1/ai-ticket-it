import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/endpoints";

// Solo los compradores tienen tarjetas: para un organizador se llama con `enabled: false` (la API
// respondería 403).
export function useTarjetas({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["tarjetas"],
    queryFn: ({ signal }) => api.usuarios.tarjetas({ signal }),
    enabled,
  });
}

export function useAgregarTarjeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.usuarios.agregarTarjeta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarjetas"] }),
  });
}

export function useQuitarTarjeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.usuarios.quitarTarjeta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarjetas"] }),
  });
}
