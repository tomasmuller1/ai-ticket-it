import { act, renderHook, waitFor } from "@testing-library/react-native";
import { fireEvent, screen } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";

import DetalleCompra from "../../src/app/compra/[id]/index";
import Comprar from "../../src/app/evento/[id]/comprar";
import { useComprar } from "../../src/hooks/compras";
import { conSesion, renderPantalla } from "../helpers/pantalla";
import { crearQueryClient, Proveedores } from "../helpers/render";
import { API, servidor } from "../helpers/servidor";

const DATOS = { eventoId: "e-1", tipoEntradaId: "t-1", cantidad: 2 };
const COMPRA = { id: "c-01", estado: "PENDIENTE" };
const TARJETA = { id: "t-1", marca: "Visa", ultimos4: "4242", vencimiento: "08/29", titular: "Sofía" };
const EVENTO = {
  id: "e-1",
  nombre: "Recital de prueba",
  categoria: { id: "musica", nombre: "Música" },
  fecha: "2026-12-10T21:00:00-03:00",
  lugar: "Estadio Único",
  imagen: "https://picsum.photos/1",
  precioDesde: 1000,
  agotado: false,
  finalizado: false,
  organizador: { id: "u-lucia", nombre: "Lucía", puntaje: null, cantidadResenias: 0 },
  descripcion: "Una noche inolvidable",
  multimedia: [],
  tiposEntrada: [{ id: "t-1", nombre: "Campo", descripcion: "", precio: 1000, cupo: 10, disponibles: 5 }],
  reseniasRecientes: [],
};

function apiDeReserva(respuestas) {
  const claves = [];
  servidor.use(
    http.post(`${API}/compras`, ({ request }) => {
      claves.push(request.headers.get("Idempotency-Key"));
      return respuestas[Math.min(claves.length, respuestas.length) - 1]();
    }),
  );
  return claves;
}

const creada = () => HttpResponse.json(COMPRA, { status: 201 });

async function usarComprar() {
  const queryClient = crearQueryClient();
  const { result } = await renderHook(() => useComprar(), {
    wrapper: ({ children }) => <Proveedores queryClient={queryClient}>{children}</Proveedores>,
  });
  return result;
}

describe("Reservar entradas", () => {
  it("manda una clave de idempotencia", async () => {
    const claves = apiDeReserva([creada]);
    const comprar = await usarComprar();

    await act(() => comprar.current.mutateAsync(DATOS));

    expect(claves[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("si se perdió la respuesta, reintentar usa la misma clave", async () => {
    const claves = apiDeReserva([() => HttpResponse.error(), creada]);
    const comprar = await usarComprar();

    await act(() => comprar.current.mutateAsync(DATOS).catch(() => {}));
    await waitFor(() => expect(comprar.current.isError).toBe(true));
    await act(() => comprar.current.mutateAsync(DATOS));

    expect(claves).toHaveLength(2);
    expect(claves[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(claves[1]).toBe(claves[0]);
  });

  it("si cambian el tipo o la cantidad, usa otra clave", async () => {
    const claves = apiDeReserva([creada]);
    const comprar = await usarComprar();

    await act(() => comprar.current.mutateAsync(DATOS));
    await act(() => comprar.current.mutateAsync({ ...DATOS, cantidad: 3 }));

    expect(claves).toHaveLength(2);
    expect(claves[1]).not.toBe(claves[0]);
  });

  it("sin respuesta, avisa que se puede reintentar sin duplicar", async () => {
    await conSesion();
    servidor.use(
      http.get(`${API}/eventos/e-1`, () => HttpResponse.json(EVENTO)),
      http.post(`${API}/compras`, () => HttpResponse.error()),
    );
    await renderPantalla(
      { index: () => null, "evento/[id]/comprar": Comprar },
      { initialUrl: "/evento/e-1/comprar" },
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Reservar 1 entrada" }));

    expect(
      await screen.findByText(
        "No pudimos confirmar tu reserva. Tocá Reservar de nuevo: no se va a duplicar.",
        {},
        { timeout: 10000 },
      ),
    ).toBeTruthy();
  });
});

describe("Después de reservar", () => {
  const RESERVADA = {
    id: "c-01",
    estado: "PENDIENTE",
    total: 1000,
    cantidad: 1,
    codigoEntrada: "ABC12345",
    precioUnitario: 1000,
    fechaCreacion: "2026-11-01T12:00:00-03:00",
    diasRestantes: null,
    cantidadMensajes: 0,
    historial: [],
    resenia: null,
    comprador: { id: "u-sofia", nombre: "Sofía" },
    evento: { ...EVENTO, organizador: { id: "u-lucia", nombre: "Lucía" } },
    tipoEntrada: { id: "t-1", nombre: "Campo" },
    acciones: {
      pagar: true,
      cancelar: true,
      validar: false,
      reseniar: false,
      chatear: true,
      reintentarReembolso: false,
    },
    operacionPago: null,
  };
  const CANCELADA = {
    ...RESERVADA,
    estado: "CANCELADA",
    acciones: { ...RESERVADA.acciones, pagar: false, cancelar: false },
  };

  // El POST responde lo que se guardó al reservar; el GET, cómo está la compra ahora.
  async function reservarYMirar(actual) {
    await conSesion();
    servidor.use(
      http.get(`${API}/eventos/e-1`, () => HttpResponse.json(EVENTO)),
      http.post(`${API}/compras`, () => HttpResponse.json(RESERVADA, { status: 201 })),
      http.get(`${API}/compras/c-01`, () => HttpResponse.json(actual)),
      http.get(`${API}/usuarios/me/tarjetas`, () => HttpResponse.json([TARJETA])),
    );
    await renderPantalla(
      { index: () => null, "evento/[id]/comprar": Comprar, "compra/[id]/index": DetalleCompra },
      { initialUrl: "/evento/e-1/comprar" },
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Reservar 1 entrada" }));
  }

  it("al reservar abre la hoja de pago", async () => {
    await reservarYMirar(RESERVADA);

    expect(await screen.findByText("Confirmá el pago")).toBeTruthy();
  });

  it("si el reintento de reservar devuelve una compra que ya se canceló, abre la compra sin la hoja", async () => {
    await reservarYMirar(CANCELADA);

    expect(await screen.findByLabelText("Estado: Cancelada")).toBeTruthy();
    expect(screen.queryByText("Confirmá el pago")).toBeNull();
  });
});
