import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as Crypto from "expo-crypto";

import { api } from "../api/endpoints";

export function useMisEventos() {
  return useQuery({ queryKey: ["eventos", "mios"], queryFn: ({ signal }) => api.eventos.mios({ signal }) });
}

// CU2: compras de un evento con el resumen de vendidas y disponibles por tipo.
export function useComprasDeEvento(eventoId, estado) {
  return useQuery({
    queryKey: ["eventos", eventoId, "compras", estado ?? "todas"],
    queryFn: ({ signal }) => api.eventos.compras(eventoId, estado, { signal }),
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

// Posponer o cancelar cambia al evento y a sus compras, y manda avisos a los compradores.
function useInvalidarTrasGestionar() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ["eventos", "compras", "notificaciones"].map((clave) =>
        queryClient.invalidateQueries({ queryKey: [clave] }),
      ),
    );
}

// La clave identifica la intención (los datos que se mandan) y se repite en cada reintento: si el pedido anterior
// llegó y se perdió la respuesta, la API devuelve esa respuesta en lugar de avisar de nuevo. Si cambian los datos
// es otra intención y lleva otra clave.
function useClavePorIntencion() {
  const intencion = useRef(null);
  return (datos) => {
    const huella = JSON.stringify(datos);
    if (intencion.current?.huella !== huella) intencion.current = { huella, clave: Crypto.randomUUID() };
    return intencion.current.clave;
  };
}

export function usePosponerEvento(id) {
  const invalidar = useInvalidarTrasGestionar();
  const claveDe = useClavePorIntencion();
  return useMutation({
    mutationFn: (datos) => api.eventos.posponer(id, datos, claveDe(datos)),
    onSuccess: invalidar,
  });
}

export function useCancelarEvento(id) {
  const invalidar = useInvalidarTrasGestionar();
  const claveDe = useClavePorIntencion();
  return useMutation({
    mutationFn: (datos) => api.eventos.cancelar(id, datos, claveDe(datos)),
    // También si falló: una cancelación cuyos reembolsos no salieron deja el evento CANCELADO igual.
    onSettled: invalidar,
  });
}
