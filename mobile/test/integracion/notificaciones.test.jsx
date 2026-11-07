import { act, renderHook } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";

import Notificaciones from "../../src/app/(tabs)/notificaciones";
import Chat from "../../src/app/compra/[id]/chat";
import { useNotificaciones } from "../../src/hooks/notificaciones";
import { conSesion, renderPantalla } from "../helpers/pantalla";
import { crearQueryClient, Proveedores } from "../helpers/render";
import { API, servidor } from "../helpers/servidor";

const EVENTO = { id: "e-rock", nombre: "Noche de Rock" };
const haceMinutos = (minutos) => new Date(Date.now() - minutos * 60_000).toISOString();

const MENSAJE_DE_LUCIA = {
  id: "n-1",
  tipo: "MENSAJE_NUEVO",
  titulo: "Lucía te escribió por Noche de Rock",
  cuerpo: "Sí, se puede entrar con mochila.",
  fechaHora: haceMinutos(5),
  leida: false,
  evento: EVENTO,
  compraId: "c-1",
};
const PAGO_APROBADO = {
  id: "n-2",
  tipo: "PAGO_CONFIRMADO",
  titulo: "Pago aprobado",
  cuerpo: "Ya tenés 2 entradas General para Noche de Rock.",
  fechaHora: haceMinutos(180),
  leida: true,
  evento: EVENTO,
  compraId: "c-1",
};

const PREGUNTA = {
  id: "m-1",
  mensaje: "¿Se puede entrar con mochila?",
  enviado: haceMinutos(10),
  autor: { id: "u-sofia", nombre: "Sofía" },
  esPropio: true,
};
const RESPUESTA = {
  id: "m-2",
  mensaje: "Sí, sin problema.",
  enviado: haceMinutos(5),
  autor: { id: "u-lucia", nombre: "Lucía" },
  esPropio: false,
};

const RUTAS = {
  _layout: () => <Stack />,
  index: () => null,
  notificaciones: Notificaciones,
  "compra/[id]/chat": Chat,
};

const pagina = (data) => ({ data, page: 1, pageSize: 20, total: data.length });
const errorInterno = () =>
  HttpResponse.json({ error: { codigo: "ERROR_INTERNO", mensaje: "Error interno" } }, { status: 500 });

// La API de notificaciones, con estado: lo que se marca leído queda leído en la próxima consulta.
function apiDeNotificaciones(iniciales) {
  const notificaciones = iniciales.map((n) => ({ ...n }));
  const pedidos = { lecturaDe: [], lecturas: [] };
  const sinLeer = () => notificaciones.filter((n) => !n.leida);
  servidor.use(
    http.get(`${API}/notificaciones`, () => HttpResponse.json(pagina(notificaciones))),
    http.get(`${API}/notificaciones/resumen`, () => HttpResponse.json({ noLeidas: sinLeer().length })),
    http.post(`${API}/notificaciones/lectura`, async ({ request }) => {
      const filtro = await request.json();
      pedidos.lecturas.push(filtro);
      const marcadas = sinLeer().filter((n) => !filtro.compraId || n.compraId === filtro.compraId);
      for (const n of marcadas) n.leida = true;
      return HttpResponse.json({ marcadas: marcadas.length });
    }),
    http.post(`${API}/notificaciones/:id/lectura`, ({ params }) => {
      pedidos.lecturaDe.push(params.id);
      const notificacion = notificaciones.find((n) => n.id === params.id);
      notificacion.leida = true;
      return HttpResponse.json(notificacion);
    }),
  );
  return pedidos;
}

function apiDelChat(mensajes) {
  const chat = { mensajes };
  servidor.use(
    http.get(`${API}/compras/c-1`, () =>
      HttpResponse.json({ id: "c-1", evento: { nombre: "Noche de Rock" } }),
    ),
    http.get(`${API}/compras/c-1/mensajes`, () => HttpResponse.json(chat.mensajes)),
  );
  return chat;
}

const abrirNotificaciones = () => renderPantalla(RUTAS, { initialUrl: "/notificaciones" });

describe("Notificaciones", () => {
  beforeEach(() => conSesion());

  it("lista las notificaciones con las no leídas destacadas", async () => {
    apiDeNotificaciones([MENSAJE_DE_LUCIA, PAGO_APROBADO]);

    await abrirNotificaciones();

    expect(
      await screen.findByRole("button", { name: /^Sin leer\. Lucía te escribió por Noche de Rock\./ }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Pago aprobado\./ })).toBeTruthy();
    expect(screen.getAllByLabelText("Sin leer")).toHaveLength(1);
    expect(screen.getByText("Hace 5 min")).toBeTruthy();
    expect(await screen.findByText("Tenés 1 sin leer")).toBeTruthy();
  });

  it("tocar una notificación de mensaje la marca leída y abre el chat de esa compra", async () => {
    const pedidos = apiDeNotificaciones([MENSAJE_DE_LUCIA]);
    apiDelChat([PREGUNTA, RESPUESTA]);
    const router = await abrirNotificaciones();

    await fireEvent.press(await screen.findByRole("button", { name: /^Sin leer\. Lucía te escribió/ }));

    expect(await screen.findByText("¿Se puede entrar con mochila?")).toBeTruthy();
    expect(router.getPathname()).toBe("/compra/c-1/chat");
    await waitFor(() => expect(pedidos.lecturaDe).toEqual(["n-1"]));
  });

  it("'Marcar todas como leídas' las marca y el botón desaparece", async () => {
    const pedidos = apiDeNotificaciones([MENSAJE_DE_LUCIA, { ...PAGO_APROBADO, leida: false }]);
    await abrirNotificaciones();

    await fireEvent.press(await screen.findByRole("button", { name: "Marcar todas como leídas" }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Marcar todas como leídas" })).toBeNull(),
    );
    expect(screen.queryAllByLabelText("Sin leer")).toHaveLength(0);
    expect(screen.getByText("Estás al día")).toBeTruthy();
    await waitFor(() => expect(pedidos.lecturas).toEqual([{}]));
  });

  it("si falla 'Marcar todas como leídas', vuelven a quedar sin leer y lo avisa", async () => {
    apiDeNotificaciones([MENSAJE_DE_LUCIA]);
    servidor.use(http.post(`${API}/notificaciones/lectura`, errorInterno));
    await abrirNotificaciones();

    await fireEvent.press(await screen.findByRole("button", { name: "Marcar todas como leídas" }));

    expect(await screen.findByText("No pudimos marcarlas como leídas")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Marcar todas como leídas" })).toBeTruthy();
    expect(screen.getAllByLabelText("Sin leer")).toHaveLength(1);
  });

  it("sin notificaciones muestra el estado vacío", async () => {
    apiDeNotificaciones([]);

    await abrirNotificaciones();

    expect(await screen.findByText("No tenés notificaciones")).toBeTruthy();
    expect(
      screen.getByText("Te avisamos acá cuando se confirme un pago, te escriban o cambie un evento."),
    ).toBeTruthy();
    expect(await screen.findByText("Estás al día")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Marcar todas como leídas" })).toBeNull();
  });

  it("si falla la carga, muestra el error y permite reintentar", async () => {
    apiDeNotificaciones([MENSAJE_DE_LUCIA]);
    let pedidosDeLista = 0;
    servidor.use(
      http.get(`${API}/notificaciones`, () => {
        pedidosDeLista += 1;
        return pedidosDeLista === 1 ? errorInterno() : HttpResponse.json(pagina([MENSAJE_DE_LUCIA]));
      }),
    );
    await abrirNotificaciones();

    expect(await screen.findByText("Tuvimos un problema interno")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Marcar todas como leídas" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("button", { name: /^Sin leer\. Lucía te escribió/ })).toBeTruthy();
  });
});

describe("Notificaciones del chat", () => {
  beforeEach(() => conSesion());

  it("abrir el chat marca leídas las notificaciones de esa compra", async () => {
    const pedidos = apiDeNotificaciones([MENSAJE_DE_LUCIA]);
    apiDelChat([PREGUNTA, RESPUESTA]);

    await renderPantalla(RUTAS, { initialUrl: "/compra/c-1/chat" });

    await waitFor(() => expect(pedidos.lecturas).toEqual([{ compraId: "c-1" }]));
  });

  it("con el chat abierto, un mensaje nuevo de la otra persona también las marca leídas", async () => {
    const pedidos = apiDeNotificaciones([MENSAJE_DE_LUCIA]);
    const chat = apiDelChat([PREGUNTA]);
    const queryClient = crearQueryClient();
    await renderPantalla(RUTAS, { initialUrl: "/compra/c-1/chat", queryClient });
    await screen.findByText("¿Se puede entrar con mochila?");
    await waitFor(() => expect(pedidos.lecturas).toHaveLength(1));

    chat.mensajes = [PREGUNTA, RESPUESTA];
    await act(() => queryClient.refetchQueries({ queryKey: ["compras", "c-1", "mensajes"] }));

    expect(await screen.findByText("Sí, sin problema.")).toBeTruthy();
    await waitFor(() => expect(pedidos.lecturas).toEqual([{ compraId: "c-1" }, { compraId: "c-1" }]));
  });
});

describe("useNotificaciones", () => {
  it("pide de a 20 y trae la página siguiente mientras falten", async () => {
    const pedidas = [];
    servidor.use(
      http.get(`${API}/notificaciones`, ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page"));
        const pageSize = Number(url.searchParams.get("pageSize"));
        pedidas.push({ page, pageSize });
        return HttpResponse.json({
          data: [{ ...PAGO_APROBADO, id: `n-${page}` }],
          page,
          pageSize,
          total: 25,
        });
      }),
    );
    const queryClient = crearQueryClient();
    const { result } = await renderHook(() => useNotificaciones(), {
      wrapper: ({ children }) => <Proveedores queryClient={queryClient}>{children}</Proveedores>,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());

    expect(pedidas).toEqual([
      { page: 1, pageSize: 20 },
      { page: 2, pageSize: 20 },
    ]);
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });
});
