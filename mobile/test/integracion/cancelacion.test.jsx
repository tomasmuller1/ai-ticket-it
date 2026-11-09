import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { fireEvent, screen } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { Alert } from "react-native";

import DetalleCompra from "../../src/app/compra/[id]/index";
import { useCancelarCompra } from "../../src/hooks/compras";
import { formato } from "../../src/utils/formato";
import { conSesion, renderPantalla } from "../helpers/pantalla";
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

describe("Confirmar la cancelación", () => {
  const CONFIRMADA = {
    id: "c-01",
    estado: "CONFIRMADA",
    total: 70000,
    cantidad: 2,
    precioUnitario: 35000,
    codigoEntrada: "ABC12345",
    diasRestantes: 5,
    reservaVenceEn: null,
    reservaPlazoCumplido: false,
    reservaVencida: false,
    cantidadMensajes: 0,
    historial: [],
    resenia: null,
    operacionPago: null,
    comprador: { id: "u-sofia", nombre: "Sofía" },
    evento: {
      id: "e-1",
      nombre: "Recital",
      fecha: "2026-12-10T21:00:00-03:00",
      lugar: "Estadio",
      imagen: "https://picsum.photos/1",
      estado: "PROGRAMADO",
      finalizado: false,
      organizador: { id: "u-lucia", nombre: "Lucía" },
    },
    tipoEntrada: { id: "t-1", nombre: "Campo" },
    acciones: {
      pagar: false,
      cancelar: true,
      validar: false,
      reseniar: false,
      chatear: true,
      reintentarReembolso: false,
    },
  };

  beforeEach(() => conSesion());
  afterEach(() => jest.restoreAllMocks());

  async function pedirCancelar(compra) {
    servidor.use(http.get(`${API}/compras/c-01`, () => HttpResponse.json(compra)));
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderPantalla(
      { _layout: () => <Stack />, index: () => null, "compra/[id]/index": DetalleCompra },
      { initialUrl: "/compra/c-01" },
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar compra" }));
    const [titulo, mensaje] = alerta.mock.calls.at(-1);
    return { titulo, mensaje };
  }

  it("con la compra pagada, dice cuánto le devolvemos", async () => {
    const { mensaje } = await pedirCancelar(CONFIRMADA);

    expect(mensaje).toBe(
      `Te devolvemos ${formato.monto(70000)} y las entradas quedan libres para otras personas.`,
    );
  });

  it("con una entrada gratis, no promete devolver $ 0", async () => {
    const { mensaje } = await pedirCancelar({ ...CONFIRMADA, total: 0, precioUnitario: 0 });

    expect(mensaje).toBe("Las entradas quedan libres para otras personas y no se te cobra nada.");
  });

  it("si la pasarela no responde al reembolsar, avisa que es temporal y que se puede reintentar", async () => {
    servidor.use(
      http.get(`${API}/compras/c-01`, () => HttpResponse.json(CONFIRMADA)),
      http.post(`${API}/compras/c-01/cancelacion`, pasarelaCaida),
    );
    // Confirma el diálogo nativo: el segundo botón es la acción.
    jest.spyOn(Alert, "alert").mockImplementation((titulo, mensaje, botones) => botones[1].onPress());
    await renderPantalla(
      { _layout: () => <Stack />, index: () => null, "compra/[id]/index": DetalleCompra },
      { initialUrl: "/compra/c-01" },
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar compra" }));

    expect(await screen.findByText("No pudimos devolverte el dinero")).toBeTruthy();
    expect(
      screen.getByText(
        "La compra quedó cancelada. Los pagos no responden en este momento, pero es algo temporal: reintentá el reembolso en unos minutos desde acá.",
      ),
    ).toBeTruthy();
  });
});
