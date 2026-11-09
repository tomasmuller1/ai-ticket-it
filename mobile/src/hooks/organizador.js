import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/endpoints";
import { useClavePorIntencion } from "./useClavePorIntencion";

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

// Posponer o cancelar cambia al evento y a sus compras, y manda avisos a los compradores. Si salió bien se esperan
// las consultas para que la pantalla a la que se vuelve ya esté al día; si falló, se refrescan sin esperar, para que
// el error se vea enseguida (con la red caída, esas consultas tardan).
function useInvalidarTrasGestionar() {
  const queryClient = useQueryClient();
  return (huboError) => {
    const todas = Promise.all(
      ["eventos", "compras", "notificaciones"].map((clave) =>
        queryClient.invalidateQueries({ queryKey: [clave] }),
      ),
    );
    return huboError ? undefined : todas;
  };
}

export function usePosponerEvento(id) {
  const invalidar = useInvalidarTrasGestionar();
  const claveDe = useClavePorIntencion();
  return useMutation({
    mutationFn: (datos) => api.eventos.posponer(id, datos, claveDe(datos)),
    onSuccess: () => invalidar(false),
  });
}

export function useCancelarEvento(id) {
  const invalidar = useInvalidarTrasGestionar();
  const claveDe = useClavePorIntencion();
  return useMutation({
    mutationFn: (datos) => api.eventos.cancelar(id, datos, claveDe(datos)),
    // También si falló: una cancelación cuyos reembolsos no salieron deja el evento CANCELADO igual.
    onSettled: (_datos, error) => invalidar(Boolean(error)),
  });
}
