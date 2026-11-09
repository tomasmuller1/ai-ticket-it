import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { Alert, AccessibilityInfo } from "react-native";
import { Stack } from "expo-router";

import DetalleEvento from "../../src/app/evento/[id]/index";
import GestionEvento from "../../src/app/organizador/evento/[id]/index";
import Cancelar from "../../src/app/organizador/evento/[id]/cancelar";
import Posponer from "../../src/app/organizador/evento/[id]/posponer";
import { CompraCard } from "../../src/components/CompraCard";
import { EventoCard } from "../../src/components/EventoCard";
import { HojaPago } from "../../src/components/HojaPago";
import { etiquetaEstadoEvento } from "../../src/utils/estados";
import { conSesion, renderPantalla } from "../helpers/pantalla";
import { renderConProveedores } from "../helpers/render";
import { API, servidor } from "../helpers/servidor";

const EN_DIAS = (dias) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

const EVENTO = {
  id: "ev-1",
  nombre: "Noche de Rock Nacional",
  fecha: EN_DIAS(3),
  estado: "PROGRAMADO",
  finalizado: false,
};

const RUTAS = {
  _layout: () => <Stack />,
  index: () => null,
  "organizador/evento/[id]/index": GestionEvento,
  "organizador/evento/[id]/posponer": Posponer,
  "organizador/evento/[id]/cancelar": Cancelar,
  "evento/[id]/index": DetalleEvento,
};

function apiDelEvento(evento = EVENTO) {
  servidor.use(
    http.get(`${API}/eventos/ev-1/compras`, () =>
      HttpResponse.json({ evento, resumenPorTipo: [], compras: [] }),
    ),
  );
}

// Registra el body y la clave de cada pedido de gestión y responde con lo que haga falta.
function apiDeGestion(ruta, respuesta = () => HttpResponse.json({ id: "ev-1" }, { status: 200 })) {
  const pedidos = [];
  servidor.use(
    http.post(`${API}/eventos/ev-1/${ruta}`, async ({ request }) => {
      pedidos.push({ body: await request.json(), clave: request.headers.get("Idempotency-Key") });
      return respuesta();
    }),
  );
  return pedidos;
}

const abrir = (ruta = "") => renderPantalla(RUTAS, { initialUrl: `/organizador/evento/ev-1${ruta}` });

// Confirma el diálogo nativo tocando el botón de acción.
function aceptarDialogo() {
  const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  return {
    alerta,
    aceptar: () =>
      alerta.mock.calls
        .at(-1)[2]
        .find((boton) => boton.style !== "cancel")
        .onPress(),
  };
}

describe("Gestión del evento", () => {
  beforeEach(() => conSesion());
  afterEach(() => jest.restoreAllMocks());

  it("la gestión del evento ofrece posponer y cancelar mientras está programado", async () => {
    apiDelEvento();

    await abrir();

    expect(await screen.findByText("Gestión del evento")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Posponer, Elegí una nueva fecha y les avisamos a los compradores",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Cancelar evento, Les devolvemos el dinero a todos los compradores",
      }),
    ).toBeTruthy();
  });

  it("no ofrece gestionar un evento cancelado o finalizado y explica por qué", async () => {
    apiDelEvento({ ...EVENTO, estado: "CANCELADO" });

    await abrir();

    expect(
      await screen.findByText("Cancelaste este evento. Devolvimos el dinero de las compras pagadas."),
    ).toBeTruthy();
    expect(screen.queryByText("Gestión del evento")).toBeNull();
  });

  it("un evento finalizado tampoco se gestiona", async () => {
    apiDelEvento({ ...EVENTO, finalizado: true });

    await abrir();

    expect(await screen.findByText("Noche de Rock Nacional")).toBeTruthy();
    expect(screen.queryByText("Gestión del evento")).toBeNull();
    expect(screen.queryByText(/Cancelaste este evento/)).toBeNull();
  });

  it("posponer exige una fecha posterior a la actual", async () => {
    apiDelEvento();
    const pedidos = apiDeGestion("postergacion");
    const enfocar = jest.fn();
    AccessibilityInfo.sendAccessibilityEvent = enfocar;
    await abrir("/posponer");

    // La persona elige una fecha anterior a la del evento.
    await screen.findByText("Nueva fecha y hora");
    const selector = screen.root.queryAll((nodo) => nodo.props.mode === "datetime")[0];
    const anterior = new Date(EVENTO.fecha).getTime() - 86_400_000;
    await fireEvent(selector, "onChange", {
      type: "set",
      nativeEvent: { timestamp: anterior, utcOffset: 0 },
    });
    await fireEvent.press(screen.getByRole("button", { name: "Posponer evento" }));

    expect(await screen.findByText("La nueva fecha tiene que ser posterior a la actual.")).toBeTruthy();
    await waitFor(() => expect(enfocar).toHaveBeenCalledWith(expect.anything(), "focus"));
    expect(pedidos).toHaveLength(0);
  });

  it("posponer envía la fecha y el motivo con clave de idempotencia y vuelve con un aviso", async () => {
    apiDelEvento();
    const pedidos = apiDeGestion("postergacion");
    const router = await abrir();
    await fireEvent.press(await screen.findByRole("button", { name: /^Posponer,/ }));

    await fireEvent.changeText(await screen.findByLabelText("Motivo (opcional)"), "Llueve");
    await fireEvent.press(screen.getByRole("button", { name: "Posponer evento" }));

    expect(await screen.findByText("Pospusimos el evento y les avisamos a los compradores")).toBeTruthy();
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].body.motivo).toBe("Llueve");
    expect(new Date(pedidos[0].body.fecha).getTime()).toBeGreaterThan(new Date(EVENTO.fecha).getTime());
    expect(pedidos[0].clave).toMatch(/^[0-9a-f-]{36}$/);
    expect(router).toHavePathname("/organizador/evento/ev-1");
  });

  it("cancelar pide confirmación y envía el motivo", async () => {
    apiDelEvento();
    const pedidos = apiDeGestion("cancelacion");
    const { alerta, aceptar } = aceptarDialogo();
    await abrir("/cancelar");
    expect(
      await screen.findByText(
        "Vamos a cancelar todas las compras y devolverles el dinero a quienes pagaron. Les avisamos a todos. No se puede deshacer.",
      ),
    ).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Motivo (opcional)"), "Fuerza mayor");
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar evento" }));

    expect(alerta.mock.calls.at(-1)[0]).toBe("¿Cancelar Noche de Rock Nacional?");
    expect(pedidos).toHaveLength(0);
    aceptar();
    expect(await screen.findByText("Cancelaste el evento. Estamos devolviendo el dinero.")).toBeTruthy();
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].body).toEqual({ motivo: "Fuerza mayor" });
    expect(pedidos[0].clave).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("si la API responde 409, muestra el mensaje", async () => {
    apiDelEvento();
    apiDeGestion("cancelacion", () =>
      HttpResponse.json(
        { error: { codigo: "EVENTO_FINALIZADO", mensaje: "El evento ya se realizó" } },
        { status: 409 },
      ),
    );
    const { aceptar } = aceptarDialogo();
    await abrir("/cancelar");
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar evento" }));
    aceptar();

    expect(await screen.findByText("El evento ya se realizó")).toBeTruthy();
  });

  it("si el pedido anterior sigue en curso, explica que hay que esperar", async () => {
    apiDelEvento();
    apiDeGestion("cancelacion", () =>
      HttpResponse.json(
        { error: { codigo: "OPERACION_EN_CURSO", mensaje: "Ya hay una operación en curso con esta clave" } },
        { status: 409 },
      ),
    );
    const { aceptar } = aceptarDialogo();
    await abrir("/cancelar");
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar evento" }));
    aceptar();

    expect(
      await screen.findByText(/Todavía estamos cancelando el evento y devolviendo el dinero/),
    ).toBeTruthy();
  });

  it("si el evento ya se canceló, lo explica", async () => {
    apiDelEvento();
    apiDeGestion("postergacion", () =>
      HttpResponse.json(
        { error: { codigo: "EVENTO_CANCELADO", mensaje: "El evento fue cancelado" } },
        { status: 409 },
      ),
    );
    await abrir("/posponer");

    await fireEvent.press(await screen.findByRole("button", { name: "Posponer evento" }));

    expect(await screen.findByText("Este evento ya se canceló: no se puede posponer.")).toBeTruthy();
  });
});

describe("Estado del evento en la app", () => {
  beforeEach(() => conSesion());

  const DETALLE = {
    id: "e-1",
    nombre: "Recital de prueba",
    categoria: { id: "musica", nombre: "Música" },
    fecha: "2026-12-10T21:00:00-03:00",
    lugar: "Estadio Único",
    imagen: "https://picsum.photos/1",
    precioDesde: 1000,
    agotado: false,
    finalizado: false,
    estado: "PROGRAMADO",
    organizador: { id: "u-lucia", nombre: "Lucía", puntaje: null, cantidadResenias: 0 },
    descripcion: "Una noche inolvidable",
    multimedia: [],
    tiposEntrada: [{ id: "t-1", nombre: "Campo", descripcion: "", precio: 1000, cupo: 10, disponibles: 5 }],
    reseniasRecientes: [],
  };

  function apiDelDetalle(evento) {
    servidor.use(
      http.get(`${API}/eventos/e-1`, () => HttpResponse.json(evento)),
      http.get(`${API}/usuarios/me/favoritos`, () => HttpResponse.json([])),
    );
  }

  it("el detalle de un evento cancelado no ofrece comprar y dice 'Este evento se canceló'", async () => {
    apiDelDetalle({ ...DETALLE, estado: "CANCELADO" });

    await renderPantalla(RUTAS, { initialUrl: "/evento/e-1" });

    expect(await screen.findByRole("button", { name: "Este evento se canceló" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Comprar entradas" })).toBeNull();
  });

  it("el detalle de un evento pospuesto dice 'Se pospuso' junto a la fecha y deja comprar", async () => {
    apiDelDetalle({ ...DETALLE, estado: "POSPUESTO" });

    await renderPantalla(RUTAS, { initialUrl: "/evento/e-1" });

    expect(await screen.findByText("Se pospuso")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Comprar entradas" })).toBeTruthy();
  });

  it("la tarjeta de un evento pospuesto muestra 'Nueva fecha'", async () => {
    await renderConProveedores(
      <EventoCard evento={{ ...DETALLE, estado: "POSPUESTO" }} onPress={() => {}} />,
    );

    expect(screen.getByText("Nueva fecha")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Nueva fecha/ })).toBeTruthy();
  });

  it("la tarjeta de un evento programado no muestra insignia", async () => {
    await renderConProveedores(<EventoCard evento={DETALLE} onPress={() => {}} />);

    expect(screen.queryByText("Nueva fecha")).toBeNull();
    expect(screen.queryByText("Cancelado")).toBeNull();
  });

  it.each([
    ["CANCELADO", "El organizador canceló el evento."],
    ["POSPUESTO", "El evento se pospuso."],
  ])("la tarjeta de una compra de un evento %s dice '%s'", async (estado, texto) => {
    const compra = {
      id: "c-1",
      cantidad: 1,
      total: 1000,
      estado: "CONFIRMADA",
      diasRestantes: null,
      evento: { nombre: "Recital", fecha: DETALLE.fecha, imagen: DETALLE.imagen, estado },
      tipoEntrada: { nombre: "Campo" },
    };

    await renderConProveedores(<CompraCard compra={compra} onPress={() => {}} />);

    expect(screen.getByText(texto)).toBeTruthy();
  });

  it("etiquetaEstadoEvento: Nueva fecha, Cancelado y nada para el programado", () => {
    expect(etiquetaEstadoEvento("POSPUESTO")).toEqual({ texto: "Nueva fecha", color: "aviso" });
    expect(etiquetaEstadoEvento("CANCELADO")).toEqual({ texto: "Cancelado", color: "peligro" });
    expect(etiquetaEstadoEvento("PROGRAMADO")).toBeNull();
  });
});

describe("Pago aprobado de un evento que se canceló", () => {
  const COMPRA = {
    id: "c-04",
    total: 52000,
    cantidad: 2,
    estado: "PENDIENTE",
    evento: { nombre: "Recital", estado: "CANCELADO" },
    tipoEntrada: { nombre: "Campo" },
  };

  it("dice que el evento se canceló y que se devuelve el dinero, no 'Pago confirmado'", async () => {
    const tarjeta = { id: "t-1", marca: "Visa", ultimos4: "4242", vencimiento: "08/29", titular: "Sofía" };
    const operacion = (estado) => ({ operacionId: "op-1", compraId: "c-04", estado, motivo: null });
    servidor.use(
      http.get(`${API}/usuarios/me/tarjetas`, () => HttpResponse.json([tarjeta])),
      http.post(`${API}/compras/c-04/pago`, () => HttpResponse.json(operacion("PENDIENTE"), { status: 202 })),
      http.get(`${API}/compras/c-04/pago/op-1`, () => HttpResponse.json(operacion("APROBADA"))),
    );
    await renderConProveedores(<HojaPago compra={COMPRA} onCerrar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole("button", { name: /^Pagar/ }));

    expect(await screen.findByText("El evento se canceló")).toBeTruthy();
    expect(
      screen.getByText("Se aprobó tu pago, pero el organizador canceló el evento. Te devolvemos el dinero."),
    ).toBeTruthy();
    expect(screen.queryByText("Pago confirmado")).toBeNull();
  });
});
