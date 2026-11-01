import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/endpoints";

export function useTarjetas() {
  return useQuery({ queryKey: ["tarjetas"], queryFn: api.usuarios.tarjetas });
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
