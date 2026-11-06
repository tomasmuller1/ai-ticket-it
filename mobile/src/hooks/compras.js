import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";

import { api } from "../api/endpoints";
import { POLLING_PAGO } from "./pago";

const INTERVALO_CHAT_MS = 3000;

const pagoEnProceso = (compra) => compra?.operacionPago?.estado === "PENDIENTE";

// Mientras haya un pago en proceso, se refresca solo para mostrar cuándo se confirma.
export function useMisCompras(estado) {
  return useQuery({
    queryKey: ["compras", "mias", estado ?? "todas"],
    queryFn: ({ signal }) => api.compras.mias(estado, { signal }),
    refetchInterval: ({ state }) => (state.data?.some(pagoEnProceso) ? POLLING_PAGO.intervaloMs : false),
  });
}

export function useCompra(id) {
  return useQuery({
    queryKey: ["compras", id],
    queryFn: ({ signal }) => api.compras.detalle(id, { signal }),
    refetchInterval: ({ state }) => (pagoEnProceso(state.data) ? POLLING_PAGO.intervaloMs : false),
  });
}

// Después de cualquier acción sobre una compra se refrescan las compras y los eventos (cambian los
// disponibles de cada tipo de entrada). También si falló: una cancelación cuyo reembolso no salió deja
// la compra CANCELADA igual, y la pantalla tiene que mostrarlo.
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

// La misma clave en cada reintento: si el pedido anterior ya reembolsó y se perdió la respuesta, la API
// devuelve esa respuesta en lugar de un error. Si el reembolso falló, la misma clave lo vuelve a intentar.
export function useCancelarCompra(id) {
  const invalidar = useInvalidarCompras();
  const clave = useRef(null);
  return useMutation({
    mutationFn: () => {
      clave.current ??= Crypto.randomUUID();
      return api.compras.cancelar(id, clave.current);
    },
    onSettled: invalidar,
  });
}

export function useValidarEntrada(id) {
  const invalidar = useInvalidarCompras();
  return useMutation({ mutationFn: () => api.compras.validar(id), onSettled: invalidar });
}

// CU5 y CU6: el chat se actualiza cada 3 segundos mientras la pantalla está abierta.
export function useMensajes(compraId) {
  return useQuery({
    queryKey: ["compras", compraId, "mensajes"],
    queryFn: ({ signal }) => api.compras.mensajes(compraId, { signal }),
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
