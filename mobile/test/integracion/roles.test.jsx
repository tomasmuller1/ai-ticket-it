import { screen } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";

import Perfil from "../../src/app/(tabs)/perfil";
import DetalleEvento from "../../src/app/evento/[id]/index";
import { conSesion, ORGANIZADOR, renderPantalla, USUARIO } from "../helpers/pantalla";
import { API, servidor } from "../helpers/servidor";

// Un evento de Lucía: ni el comprador ni Martín (organizador) son los dueños.
const EVENTO = {
  id: "e-1",
  nombre: "Recital de prueba",
  categoria: { id: "musica", nombre: "Música" },
  estado: "PROGRAMADO",
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

// Las requests que llegan a la API simulada: así se verifica que el organizador no pide lo que no le toca.
let pedidos;

beforeEach(() => {
  pedidos = [];
  servidor.events.on("request:start", ({ request }) => pedidos.push(new URL(request.url).pathname));
  servidor.use(
    http.get(`${API}/eventos/e-1`, () => HttpResponse.json(EVENTO)),
    http.get(`${API}/usuarios/me/favoritos`, () => HttpResponse.json([])),
    http.get(`${API}/usuarios/me/tarjetas`, () => HttpResponse.json([])),
    http.get(`${API}/dev/pasarela`, () => HttpResponse.json({ disponible: true })),
  );
});

afterEach(() => servidor.events.removeAllListeners());

const abrirEvento = () =>
  renderPantalla({ "evento/[id]/index": DetalleEvento }, { initialUrl: "/evento/e-1" });

describe("Detalle de un evento según el tipo de cuenta", () => {
  it("el comprador puede comprar y guardarlo en favoritos", async () => {
    await conSesion(USUARIO);
    await abrirEvento();

    expect(await screen.findByRole("button", { name: "Comprar entradas" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agregar a favoritos" })).toBeTruthy();
  });

  it("el organizador lo ve, pero no puede comprar ni guardarlo, y no pide sus favoritos", async () => {
    await conSesion(ORGANIZADOR);
    await abrirEvento();

    expect(
      await screen.findByText(
        "Con tu cuenta de organizador podés ver los eventos, pero no comprar entradas.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Comprar entradas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Agregar a favoritos" })).toBeNull();
    expect(pedidos).not.toContain("/api/usuarios/me/favoritos");
  });

  it("en un evento propio, el organizador lo gestiona", async () => {
    await conSesion(ORGANIZADOR);
    servidor.use(
      http.get(`${API}/eventos/e-1`, () =>
        HttpResponse.json({ ...EVENTO, organizador: { ...EVENTO.organizador, id: ORGANIZADOR.id } }),
      ),
    );
    await abrirEvento();

    expect(await screen.findByRole("button", { name: "Gestionar evento" })).toBeTruthy();
  });
});

describe("Perfil según el tipo de cuenta", () => {
  const abrirPerfil = () => renderPantalla({ "(tabs)/perfil": Perfil }, { initialUrl: "/perfil" });

  it("el comprador ve su tipo de cuenta y sus medios de pago", async () => {
    await conSesion(USUARIO);
    await abrirPerfil();

    expect(await screen.findByLabelText("Cuenta de comprador")).toBeTruthy();
    expect(await screen.findByRole("button", { name: /^Medios de pago/ })).toBeTruthy();
  });

  it("el organizador ve su tipo de cuenta, sin medios de pago ni el pedido de sus tarjetas", async () => {
    await conSesion(ORGANIZADOR);
    await abrirPerfil();

    expect(await screen.findByLabelText("Cuenta de organizador")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Medios de pago/ })).toBeNull();
    expect(pedidos).not.toContain("/api/usuarios/me/tarjetas");
  });
});
