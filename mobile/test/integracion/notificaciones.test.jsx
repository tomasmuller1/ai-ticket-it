import { act, renderHook } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";

import TabsLayout from "../../src/app/(tabs)/_layout";
import Explorar from "../../src/app/(tabs)/index";
import Notificaciones from "../../src/app/(tabs)/notificaciones";
import Perfil from "../../src/app/(tabs)/perfil";
import Chat from "../../src/app/compra/[id]/chat";
import Favoritos from "../../src/app/favoritos";
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

  it("si falla un refresco del chat, no las vuelve a marcar cuando se recupera", async () => {
    const pedidos = apiDeNotificaciones([MENSAJE_DE_LUCIA]);
    apiDelChat([PREGUNTA, RESPUESTA]);
    const queryClient = crearQueryClient();
    await renderPantalla(RUTAS, { initialUrl: "/compra/c-1/chat", queryClient });
    await waitFor(() => expect(pedidos.lecturas).toHaveLength(1));
    const CLAVE_CHAT = ["compras", "c-1", "mensajes"];
    // React Query le avisa a la pantalla en el tick siguiente: se espera ese tick para que la pantalla vea
    // cada resultado, como pasa entre dos consultas del polling.
    async function refrescar() {
      await act(() => queryClient.refetchQueries({ queryKey: CLAVE_CHAT }));
      await act(() => new Promise((resolver) => setTimeout(resolver, 0)));
    }

    servidor.use(http.get(`${API}/compras/c-1/mensajes`, () => HttpResponse.error(), { once: true }));
    await refrescar();
    expect(queryClient.getQueryState(CLAVE_CHAT).status).toBe("error");
    await refrescar();
    expect(queryClient.getQueryState(CLAVE_CHAT).status).toBe("success");
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));

    expect(screen.getByText("Sí, sin problema.")).toBeTruthy();
    expect(pedidos.lecturas).toHaveLength(1);
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

const Vacia = () => null;

// Las pestañas reales, con las pantallas que cada test necesita. Favoritos ya no es una pestaña: va en el Stack.
const rutasConBarra = ({ index = Vacia, perfil = Vacia } = {}) => ({
  _layout: () => <Stack />,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/index": index,
  "(tabs)/compras": Vacia,
  "(tabs)/notificaciones": Vacia,
  "(tabs)/organizador": Vacia,
  "(tabs)/perfil": perfil,
  favoritos: Favoritos,
});

describe("La barra con Avisos", () => {
  beforeEach(() => conSesion());

  it("tiene Explorar, Entradas, Avisos, Eventos y Perfil, sin Favoritos", async () => {
    await renderPantalla(rutasConBarra(), { initialUrl: "/notificaciones" });

    const pestanias = await screen.findAllByRole("tab");
    expect(pestanias.map((pestania) => pestania.props.accessibilityLabel)).toEqual([
      "Explorar",
      "Entradas",
      "Notificaciones",
      "Eventos",
      "Perfil",
    ]);
    // La píldora de la pestaña activa dice "Avisos": "Notificaciones" no entra en 360 pt.
    expect(screen.getByText("Avisos")).toBeTruthy();
  });

  it("la pestaña muestra la burbuja y anuncia las no leídas del resumen", async () => {
    servidor.use(http.get(`${API}/notificaciones/resumen`, () => HttpResponse.json({ noLeidas: 12 })));

    await renderPantalla(rutasConBarra(), { initialUrl: "/" });

    expect(await screen.findByRole("tab", { name: "Notificaciones, 12 sin leer" })).toBeTruthy();
    expect(screen.getByText("9+", { includeHiddenElements: true })).toBeTruthy();
  });
});

describe("Favoritos fuera de la barra", () => {
  beforeEach(async () => {
    await conSesion();
    servidor.use(
      http.get(`${API}/categorias`, () => HttpResponse.json([])),
      http.get(`${API}/eventos`, () => HttpResponse.json({ data: [], page: 1, pageSize: 10, total: 0 })),
      http.get(`${API}/usuarios/me/favoritos`, () => HttpResponse.json([])),
      http.get(`${API}/usuarios/me/tarjetas`, () => HttpResponse.json([])),
      http.get(`${API}/dev/pasarela`, () => HttpResponse.json({ disponible: true })),
    );
  });

  it("se abre desde el corazón del encabezado de Explorar", async () => {
    const router = await renderPantalla(rutasConBarra({ index: Explorar }), { initialUrl: "/" });

    await fireEvent.press(await screen.findByRole("button", { name: "Tus favoritos" }));

    expect(await screen.findByText("Guardá los eventos que te gustan")).toBeTruthy();
    expect(router.getPathname()).toBe("/favoritos");
  });

  it("se abre desde una fila de Perfil", async () => {
    const router = await renderPantalla(rutasConBarra({ perfil: Perfil }), { initialUrl: "/perfil" });

    await fireEvent.press(
      await screen.findByRole("button", { name: "Favoritos, Todavía no guardaste eventos" }),
    );

    expect(await screen.findByText("Guardá los eventos que te gustan")).toBeTruthy();
    expect(router.getPathname()).toBe("/favoritos");
  });
});
