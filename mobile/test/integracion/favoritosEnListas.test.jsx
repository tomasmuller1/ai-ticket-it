import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { FlatList } from "react-native";
import { Stack } from "expo-router";
import { http, HttpResponse } from "msw";

import TabsLayout from "../../src/app/(tabs)/_layout";
import Favoritos from "../../src/app/(tabs)/favoritos";
import Explorar from "../../src/app/(tabs)/index";
import { conSesion, ORGANIZADOR, renderPantalla, USUARIO } from "../helpers/pantalla";
import { API, servidor } from "../helpers/servidor";

const evento = (id, nombre) => ({
  id,
  nombre,
  categoria: { id: "musica", nombre: "Música" },
  estado: "PROGRAMADO",
  fecha: "2026-12-10T21:00:00-03:00",
  lugar: "Estadio Único",
  imagen: "https://picsum.photos/1",
  precioDesde: 1000,
  agotado: false,
  finalizado: false,
  organizador: { id: "u-lucia", nombre: "Lucía", puntaje: null, cantidadResenias: 0 },
});

const ROCK = evento("e-rock", "Rock Nacional");
const JAZZ = evento("e-jazz", "Jazz Club");

const pagina = (data, { page = 1, pageSize = 10, total = data.length } = {}) => ({
  data,
  page,
  pageSize,
  total,
});

// Las requests que llegan a la API simulada, con su método y su query.
let pedidos;

beforeEach(() => {
  pedidos = [];
  servidor.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    pedidos.push({ metodo: request.method, ruta: url.pathname, query: url.searchParams });
  });
  servidor.use(
    http.get(`${API}/categorias`, () => HttpResponse.json([])),
    http.get(`${API}/eventos`, () => HttpResponse.json(pagina([ROCK, JAZZ]))),
  );
});

afterEach(() => servidor.events.removeAllListeners());

describe("Favoritos desde Explorar, sin entrar al evento", () => {
  it("el comprador ve el corazón en cada evento y lo guarda en el momento", async () => {
    let favoritos = ["e-jazz"];
    servidor.use(
      http.get(`${API}/usuarios/me/favoritos/ids`, () => HttpResponse.json(favoritos)),
      http.put(`${API}/usuarios/me/favoritos/:id`, ({ params }) => {
        favoritos = [params.id, ...favoritos];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await conSesion(USUARIO);
    const router = await renderPantalla({ "(tabs)/index": Explorar });

    expect(await screen.findByRole("button", { name: "Quitar Jazz Club de favoritos" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Agregar Rock Nacional a favoritos" }));

    expect(await screen.findByRole("button", { name: "Quitar Rock Nacional de favoritos" })).toBeTruthy();
    await waitFor(() => expect(favoritos).toContain("e-rock"));
    // Guardarlo no abre el evento.
    expect(router.getPathname()).toBe("/");
  });

  it("el organizador no ve el corazón ni pide favoritos", async () => {
    await conSesion(ORGANIZADOR);
    await renderPantalla({ "(tabs)/index": Explorar });

    expect(await screen.findByText("Rock Nacional")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /favoritos/ })).toBeNull();
    expect(pedidos.some((p) => p.ruta.startsWith("/api/usuarios/me/favoritos"))).toBe(false);
  });
});

describe("Pestaña Favoritos", () => {
  it("quita un evento sin entrar y lo saca de la lista", async () => {
    let favoritos = [ROCK, JAZZ];
    servidor.use(
      http.get(`${API}/usuarios/me/favoritos`, () => HttpResponse.json(pagina(favoritos))),
      http.get(`${API}/usuarios/me/favoritos/ids`, () => HttpResponse.json(favoritos.map((e) => e.id))),
      http.delete(`${API}/usuarios/me/favoritos/:id`, ({ params }) => {
        favoritos = favoritos.filter((e) => e.id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await conSesion(USUARIO);
    const router = await renderPantalla({ "(tabs)/favoritos": Favoritos }, { initialUrl: "/favoritos" });

    expect(await screen.findByText("2 eventos guardados")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Quitar Rock Nacional de favoritos" }));

    await waitFor(() => expect(screen.queryByText("Rock Nacional")).toBeNull());
    expect(screen.getByText("Jazz Club")).toBeTruthy();
    expect(await screen.findByText("1 evento guardado")).toBeTruthy();
    expect(router.getPathname()).toBe("/favoritos");
  });

  it("pide los favoritos de a páginas y trae la siguiente al llegar al final", async () => {
    servidor.use(
      http.get(`${API}/usuarios/me/favoritos`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        return HttpResponse.json(
          page === 1
            ? pagina([ROCK], { total: 2, pageSize: 1 })
            : pagina([JAZZ], { page: 2, pageSize: 1, total: 2 }),
        );
      }),
      http.get(`${API}/usuarios/me/favoritos/ids`, () => HttpResponse.json(["e-rock", "e-jazz"])),
    );
    await conSesion(USUARIO);
    await renderPantalla({ "(tabs)/favoritos": Favoritos }, { initialUrl: "/favoritos" });

    expect(await screen.findByText("Rock Nacional")).toBeTruthy();
    expect(screen.queryByText("Jazz Club")).toBeNull();

    await fireEvent(screen.getByLabelText("Tus favoritos"), "onEndReached");

    expect(await screen.findByText("Jazz Club")).toBeTruthy();
    const paginas = pedidos
      .filter((p) => p.ruta === "/api/usuarios/me/favoritos")
      .map((p) => p.query.get("page"));
    expect(paginas).toEqual(["1", "2"]);
  });
});

describe("Volver arriba tocando la pestaña", () => {
  const Vacia = () => null;
  const rutas = {
    _layout: () => <Stack />,
    "(tabs)/_layout": TabsLayout,
    "(tabs)/index": Explorar,
    "(tabs)/favoritos": Vacia,
    "(tabs)/compras": Vacia,
    "(tabs)/notificaciones": Vacia,
    "(tabs)/organizador": Vacia,
    "(tabs)/perfil": Vacia,
  };

  afterEach(() => jest.restoreAllMocks());

  it("tocar Explorar estando en Explorar lleva la lista al principio", async () => {
    const desplazar = jest.spyOn(FlatList.prototype, "scrollToOffset");
    servidor.use(http.get(`${API}/usuarios/me/favoritos/ids`, () => HttpResponse.json([])));
    await conSesion(USUARIO);
    await renderPantalla(rutas, { initialUrl: "/" });
    await screen.findByText("Rock Nacional");

    await fireEvent.press(screen.getByRole("tab", { name: "Explorar" }));

    await waitFor(() => expect(desplazar).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 })));
  });
});
