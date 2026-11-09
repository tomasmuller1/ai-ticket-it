import { act, renderHook, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";

import { useCancelarCompra } from "../../src/hooks/compras";
import { crearQueryClient, Proveedores } from "../helpers/render";
import { API, servidor } from "../helpers/servidor";

function apiDeCancelacion(respuestas) {
  const claves = [];
  servidor.use(
    http.post(`${API}/compras/c-01/cancelacion`, ({ request }) => {
      claves.push(request.headers.get("Idempotency-Key"));
      return respuestas[claves.length - 1]();
    }),
    http.get(`${API}/compras/c-01`, () => HttpResponse.json({ id: "c-01", estado: "REEMBOLSADA" })),
  );
  return claves;
}

const reembolsada = () => HttpResponse.json({ id: "c-01", estado: "REEMBOLSADA" });
const pasarelaCaida = () =>
  HttpResponse.json({ error: { codigo: "PASARELA_NO_DISPONIBLE", mensaje: "Sin pagos" } }, { status: 503 });

async function usarCancelar(queryClient = crearQueryClient()) {
  const { result } = await renderHook(() => useCancelarCompra("c-01"), {
    wrapper: ({ children }) => <Proveedores queryClient={queryClient}>{children}</Proveedores>,
  });
  return result;
}

describe("Cancelar una compra", () => {
  it("manda una clave de idempotencia", async () => {
    const claves = apiDeCancelacion([reembolsada]);
    const cancelar = await usarCancelar();

    await act(() => cancelar.current.mutateAsync());

    expect(claves[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("si se perdió la respuesta, reintentar usa la misma clave y no reembolsa dos veces", async () => {
    const claves = apiDeCancelacion([() => HttpResponse.error(), reembolsada]);
    const cancelar = await usarCancelar();

    await act(() => cancelar.current.mutateAsync().catch(() => {}));
    await waitFor(() => expect(cancelar.current.isError).toBe(true));
    await act(() => cancelar.current.mutateAsync());

    expect(claves).toHaveLength(2);
    expect(claves[1]).toBe(claves[0]);
  });

  it("al terminar refresca las notificaciones: puede haber llegado el aviso del reembolso", async () => {
    apiDeCancelacion([reembolsada]);
    const queryClient = crearQueryClient();
    queryClient.setQueryData(["notificaciones", "resumen"], { noLeidas: 0 });
    const cancelar = await usarCancelar(queryClient);

    await act(() => cancelar.current.mutateAsync());

    expect(queryClient.getQueryState(["notificaciones", "resumen"]).isInvalidated).toBe(true);
  });

  it("si el reembolso falló, reintentarlo usa la misma clave", async () => {
    const claves = apiDeCancelacion([pasarelaCaida, reembolsada]);
    const cancelar = await usarCancelar();

    await act(() => cancelar.current.mutateAsync().catch(() => {}));
    await waitFor(() => expect(cancelar.current.isError).toBe(true));
    await act(() => cancelar.current.mutateAsync());

    expect(claves[1]).toBe(claves[0]);
  });
});
