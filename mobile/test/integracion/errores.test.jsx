import { Stack } from "expo-router";
import { fireEvent, screen } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";

import { almacenamiento } from "../../src/api/almacenamiento";
import NoEncontrada from "../../src/app/+not-found";
import Chat from "../../src/app/compra/[id]/chat";
import DetalleCompra from "../../src/app/compra/[id]/index";
import DetalleEvento from "../../src/app/evento/[id]/index";
import Login from "../../src/app/login";
import { conSesion, renderPantalla } from "../helpers/pantalla";
import { crearQueryClient } from "../helpers/render";
import { API, servidor } from "../helpers/servidor";

const ID = "00000000-0000-4000-8000-000000000000";
const RUTAS = {
  _layout: () => <Stack />,
  index: () => null,
  "evento/[id]/index": DetalleEvento,
  "compra/[id]/index": DetalleCompra,
  "compra/[id]/chat": Chat,
};

const errorApi = (status, codigo, mensaje) => () =>
  HttpResponse.json({ error: { codigo, mensaje } }, { status });

const EVENTO = {
  id: ID,
  nombre: "Recital de prueba",
  descripcion: "Un recital",
  fecha: "2026-12-10T21:00:00-03:00",
  lugar: "Estadio",
  multimedia: [],
  categoria: { id: "musica", nombre: "Música" },
  organizador: { id: "u-lucia", nombre: "Lucía", puntaje: null, cantidadResenias: 0 },
  tiposEntrada: [],
  reseniasRecientes: [],
  precioDesde: 1000,
  finalizado: false,
  agotado: false,
};

describe("pantallas de error", () => {
  beforeEach(async () => {
    await conSesion();
    servidor.use(http.get(`${API}/usuarios/me/favoritos`, () => HttpResponse.json([])));
  });

  describe("evento inexistente (404)", () => {
    beforeEach(() => {
      servidor.use(
        http.get(`${API}/eventos/${ID}`, errorApi(404, "NO_ENCONTRADO", `No existe el evento ${ID}`)),
      );
    });

    it("muestra solo el mensaje: sin Reintentar y sin el id", async () => {
      await renderPantalla(RUTAS, { initialUrl: `/evento/${ID}` });

      expect(await screen.findByText("Este evento ya no existe")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
      expect(screen.queryByText(new RegExp(ID))).toBeNull();
    });

    it("deja volver, aunque se haya llegado con un enlace", async () => {
      const router = await renderPantalla(RUTAS, { initialUrl: `/evento/${ID}` });

      await fireEvent.press(await screen.findByRole("button", { name: "Volver" }));

      expect(router.getPathname()).toBe("/");
    });
  });

  it("con un 500 distingue el problema interno y Reintentar carga los datos", async () => {
    let caido = true;
    servidor.use(
      http.get(`${API}/eventos/${ID}`, () =>
        caido ? errorApi(500, "ERROR_INTERNO", "Error interno del servidor")() : HttpResponse.json(EVENTO),
      ),
    );

    await renderPantalla(RUTAS, { initialUrl: `/evento/${ID}` });

    expect(await screen.findByText("Tuvimos un problema interno")).toBeTruthy();
    expect(screen.queryByText("Error interno del servidor")).toBeNull();

    caido = false;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Recital de prueba")).toBeTruthy();
  });

  it("sin conexión lo dice y ofrece Reintentar", async () => {
    servidor.use(http.get(`${API}/eventos/${ID}`, () => HttpResponse.error()));

    await renderPantalla(RUTAS, { initialUrl: `/evento/${ID}` });

    expect(await screen.findByText("No pudimos conectarnos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("con un 403 avisa que no tiene acceso a la compra, sin Reintentar", async () => {
    servidor.use(http.get(`${API}/compras/c-1`, errorApi(403, "PROHIBIDO", "Solo el comprador puede verla")));

    await renderPantalla(RUTAS, { initialUrl: "/compra/c-1" });

    expect(await screen.findByText("No tenés acceso a esta compra")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("si falla el polling del chat, los mensajes siguen en pantalla", async () => {
    const mensaje = {
      id: "m-1",
      mensaje: "¿Hay estacionamiento?",
      enviado: "2026-11-01T12:00:00-03:00",
      autor: { id: "u-sofia", nombre: "Sofía" },
      esPropio: true,
    };
    const queryClient = crearQueryClient();
    const mensajes = jest.fn(() => HttpResponse.json([mensaje]));
    servidor.use(
      http.get(`${API}/compras/c-1`, () => HttpResponse.json({ evento: { nombre: "Recital" } })),
      http.get(`${API}/compras/c-1/mensajes`, mensajes),
      // Al mostrar los mensajes, el chat marca leídas las notificaciones de la compra.
      http.post(`${API}/notificaciones/lectura`, () => HttpResponse.json({ marcadas: 0 })),
    );
    await renderPantalla(RUTAS, { initialUrl: "/compra/c-1/chat", queryClient });
    expect(await screen.findByText("¿Hay estacionamiento?")).toBeTruthy();

    mensajes.mockImplementation(() => HttpResponse.error());
    await queryClient.refetchQueries({ queryKey: ["compras", "c-1", "mensajes"] });

    expect(await screen.findByText("¿Hay estacionamiento?")).toBeTruthy();
    expect(screen.queryByText("No pudimos conectarnos")).toBeNull();
  });
});

describe("ruta inexistente", () => {
  it("muestra una pantalla en español con una salida al inicio", async () => {
    const router = await renderPantalla(
      { index: () => null, "+not-found": NoEncontrada },
      { initialUrl: "/esto/no/existe" },
    );

    expect(await screen.findByText("Esta pantalla no existe")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ir al inicio" }));

    expect(router.getPathname()).toBe("/");
  });
});

describe("sesión vencida", () => {
  it("el login explica por qué se volvió a pedir el ingreso", async () => {
    await almacenamiento.guardarRefreshToken("refresh-vencido");
    servidor.use(http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })));

    await renderPantalla({ index: Login }, { initialUrl: "/" });

    expect(await screen.findByText("Tu sesión venció. Ingresá de nuevo para seguir.")).toBeTruthy();
  });

  it("no dice que venció si la persona nunca había iniciado sesión", async () => {
    await renderPantalla({ index: Login }, { initialUrl: "/" });

    await screen.findByText("Iniciá sesión");
    expect(screen.queryByText(/Tu sesión venció/)).toBeNull();
  });
});
