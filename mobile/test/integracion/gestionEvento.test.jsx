import { act, fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import * as Haptics from "expo-haptics";
import { Alert, AccessibilityInfo, StyleSheet } from "react-native";

import { almacenamiento } from "../../src/api/almacenamiento";
import { Stack } from "expo-router";

import DetalleEvento from "../../src/app/evento/[id]/index";
import GestionEvento from "../../src/app/organizador/evento/[id]/index";
import Cancelar from "../../src/app/organizador/evento/[id]/cancelar";
import Posponer from "../../src/app/organizador/evento/[id]/posponer";
import { CompraCard } from "../../src/components/CompraCard";
import { RetomarPago } from "../../src/components/RetomarPago";
import MisEventos from "../../src/app/(tabs)/organizador";
import DetalleCompra from "../../src/app/compra/[id]/index";
import { EventoCard } from "../../src/components/EventoCard";
import { HojaPago } from "../../src/components/HojaPago";
import { etiquetaEstadoEvento } from "../../src/utils/estados";
import { resolverTema } from "../../src/theme";
import { conSesion, renderPantalla } from "../helpers/pantalla";
import { crearQueryClient, renderConProveedores } from "../helpers/render";
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
        name: "Cancelar evento, Les devolvemos el dinero a quienes pagaron",
      }),
    ).toBeTruthy();
  });

  it("no ofrece gestionar un evento cancelado o finalizado y explica por qué", async () => {
    apiDelEvento({ ...EVENTO, estado: "CANCELADO" });

    await abrir();

    expect(
      await screen.findByText("Cancelaste este evento. Les devolvemos el dinero a quienes pagaron."),
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
    // Los tests corren con el preset de iOS: `sendAccessibilityEvent` existe y se espía (el `afterEach` lo restaura).
    jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent").mockImplementation(enfocar);
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

describe("Gestión del evento: más reglas", () => {
  beforeEach(() => conSesion());
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ["posponer", { ...EVENTO, estado: "CANCELADO" }, "Este evento ya se canceló"],
    ["posponer", { ...EVENTO, finalizado: true }, "Este evento ya se realizó"],
    ["cancelar", { ...EVENTO, estado: "CANCELADO" }, "Este evento ya se canceló"],
    ["cancelar", { ...EVENTO, finalizado: true }, "Este evento ya se realizó"],
  ])(
    "la pantalla de %s con un evento que ya no se gestiona explica por qué",
    async (ruta, evento, titulo) => {
      apiDelEvento(evento);

      await abrir(`/${ruta}`);

      expect(await screen.findByText(titulo)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^(Posponer|Cancelar) evento$/ })).toBeNull();
    },
  );

  it("'Volver al evento' lleva a la gestión aunque no haya pantalla anterior", async () => {
    apiDelEvento({ ...EVENTO, estado: "CANCELADO" });
    const router = await abrir("/cancelar");

    await fireEvent.press(await screen.findByRole("button", { name: "Volver al evento" }));

    expect(
      await screen.findByText("Cancelaste este evento. Les devolvemos el dinero a quienes pagaron."),
    ).toBeTruthy();
    expect(router).toHavePathname("/organizador/evento/ev-1");
  });

  it("la nueva fecha no puede ser anterior a la del evento", async () => {
    const fecha = EN_DIAS(30);
    apiDelEvento({ ...EVENTO, fecha });

    await abrir("/posponer");

    await screen.findByText("Nueva fecha y hora");
    const selector = screen.root.queryAll((nodo) => nodo.props.mode === "datetime")[0];
    expect(new Date(selector.props.minimumDate).toISOString()).toBe(fecha);
  });

  it.each([
    ["posponer", "postergacion", "Posponer evento"],
    ["cancelar", "cancelacion", "Cancelar evento"],
  ])("al %s refresca las notificaciones: llegan avisos nuevos", async (ruta, endpoint, boton) => {
    apiDelEvento();
    apiDeGestion(endpoint);
    const { aceptar } = aceptarDialogo();
    const queryClient = crearQueryClient();
    queryClient.setQueryData(["notificaciones", "resumen"], { noLeidas: 0 });
    await renderPantalla(RUTAS, { initialUrl: `/organizador/evento/ev-1/${ruta}`, queryClient });

    await fireEvent.press(await screen.findByRole("button", { name: boton }));
    if (ruta === "cancelar") aceptar();

    await waitFor(() =>
      expect(queryClient.getQueryState(["notificaciones", "resumen"]).isInvalidated).toBe(true),
    );
  });

  it("si cancelar falla por la red, el error se ve sin esperar a los refetch", async () => {
    apiDelEvento();
    // Las consultas que se refrescan después no responden nunca: si el error las esperara, no se vería.
    let primera = true;
    servidor.use(
      http.get(`${API}/eventos/ev-1/compras`, async () => {
        if (primera) {
          primera = false;
          return HttpResponse.json({ evento: EVENTO, resumenPorTipo: [], compras: [] });
        }
        return new Promise(() => {});
      }),
      http.post(`${API}/eventos/ev-1/cancelacion`, () => HttpResponse.error()),
    );
    const { aceptar } = aceptarDialogo();
    await abrir("/cancelar");
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar evento" }));
    aceptar();

    expect(await screen.findByText(/conexión|conectarnos/i)).toBeTruthy();
  });

  it("'Mis eventos' muestra la insignia y un evento cancelado no dice 'Ya se realizó' aunque la fecha pasó", async () => {
    const base = { imagen: "https://picsum.photos/1", lugar: "Obras", vendidas: 0, cupoTotal: 10 };
    servidor.use(
      http.get(`${API}/eventos/mios`, () =>
        HttpResponse.json([
          {
            ...base,
            id: "a",
            nombre: "Cancelado y pasado",
            fecha: EN_DIAS(-2),
            finalizado: true,
            estado: "CANCELADO",
          },
          {
            ...base,
            id: "b",
            nombre: "Con nueva fecha",
            fecha: EN_DIAS(9),
            finalizado: false,
            estado: "POSPUESTO",
          },
          { ...base, id: "c", nombre: "Ya pasó", fecha: EN_DIAS(-2), finalizado: true, estado: "PROGRAMADO" },
        ]),
      ),
    );

    await renderConProveedores(<MisEventos />);

    expect(await screen.findByText("Cancelado")).toBeTruthy();
    expect(screen.getByText("Nueva fecha")).toBeTruthy();
    expect(screen.getAllByText("Ya se realizó")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^Cancelado y pasado\. .*\. Cancelado\./ })).toBeTruthy();
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
    expect(screen.getByText("El organizador canceló este evento.")).toBeTruthy();
    expect(screen.getByText("Cancelado")).toBeTruthy();
    // Sin disponibilidad ni precio: no se puede comprar nada.
    expect(screen.queryByText("Disponible")).toBeNull();
    expect(screen.queryByText(/Quedan/)).toBeNull();
    expect(screen.queryByText(/^Desde$/)).toBeNull();
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

  it("la tarjeta de un evento pospuesto y agotado muestra las dos marcas", async () => {
    await renderConProveedores(
      <EventoCard evento={{ ...DETALLE, estado: "POSPUESTO", agotado: true }} onPress={() => {}} />,
    );

    expect(screen.getByText("Nueva fecha")).toBeTruthy();
    expect(screen.getByText("Agotado")).toBeTruthy();
  });

  it("la compra de un evento cancelado lo explica al comprador", async () => {
    const compra = {
      id: "c-1",
      estado: "REEMBOLSADA",
      cantidad: 1,
      total: 1000,
      precioUnitario: 1000,
      diasRestantes: null,
      codigoEntrada: "ABC",
      acciones: {},
      historial: [],
      comprador: { id: "u-sofia", nombre: "Sofía Ruiz" },
      evento: { ...DETALLE, estado: "CANCELADO", organizador: DETALLE.organizador },
      tipoEntrada: { nombre: "Campo" },
    };
    servidor.use(http.get(`${API}/compras/c-1`, () => HttpResponse.json(compra)));

    await renderPantalla(
      { _layout: () => <Stack />, index: () => null, "compra/[id]/index": DetalleCompra },
      { initialUrl: "/compra/c-1" },
    );

    expect(await screen.findByText("El organizador canceló el evento.")).toBeTruthy();
  });

  it("etiquetaEstadoEvento: Nueva fecha, Cancelado y nada para el programado", () => {
    expect(etiquetaEstadoEvento("POSPUESTO")).toEqual({ texto: "Nueva fecha", color: "aviso" });
    expect(etiquetaEstadoEvento("CANCELADO")).toEqual({ texto: "Cancelado", color: "peligro" });
    expect(etiquetaEstadoEvento("PROGRAMADO")).toBeNull();
  });
});

describe("Pago aprobado de un evento que se canceló mientras se cobraba", () => {
  // Al abrir la hoja el evento sigue PROGRAMADO: se cancela con el cobro en vuelo, y recién la compra que se vuelve
  // a pedir al resolverse la operación lo dice.
  const COMPRA = {
    id: "c-04",
    total: 52000,
    cantidad: 2,
    estado: "PENDIENTE",
    evento: { nombre: "Recital", estado: "PROGRAMADO" },
    tipoEntrada: { nombre: "Campo" },
  };
  const TARJETA = { id: "t-1", marca: "Visa", ultimos4: "4242", vencimiento: "08/29", titular: "Sofía" };
  const operacion = (estado) => ({ operacionId: "op-1", compraId: "c-04", estado, motivo: null });
  const CANCELADA = { ...COMPRA, estado: "REEMBOLSADA", evento: { nombre: "Recital", estado: "CANCELADO" } };
  const TEXTO = "Se aprobó tu pago, pero el organizador canceló el evento. Te devolvemos el dinero.";

  function apiDelCobro() {
    servidor.use(
      http.get(`${API}/usuarios/me/tarjetas`, () => HttpResponse.json([TARJETA])),
      http.post(`${API}/compras/c-04/pago`, () => HttpResponse.json(operacion("PENDIENTE"), { status: 202 })),
      http.get(`${API}/compras/c-04/pago/op-1`, () => HttpResponse.json(operacion("APROBADA"))),
      http.get(`${API}/compras/c-04`, () => HttpResponse.json(CANCELADA)),
    );
  }

  // `announceForAccessibility` ya es un mock de React Native: sus llamadas se acumulan entre tests si no se limpian.
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it("la hoja dice que el evento se canceló y que se devuelve el dinero, y nunca anuncia 'Pago confirmado'", async () => {
    apiDelCobro();
    const anuncio = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
    const exito = jest.spyOn(Haptics, "notificationAsync").mockImplementation(async () => {});
    await renderConProveedores(<HojaPago compra={COMPRA} onCerrar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole("button", { name: /^Pagar/ }));

    expect(await screen.findByText("El evento se canceló")).toBeTruthy();
    expect(screen.getByText(TEXTO)).toBeTruthy();
    expect(screen.queryByText("Pago confirmado")).toBeNull();
    expect(anuncio.mock.calls.flat().join(" ")).not.toMatch(/Pago confirmado/);
    expect(exito).not.toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it("al retomar el pago, avisa que el evento se canceló y no que el pago se confirmó", async () => {
    await almacenamiento.guardarPagoEnCurso({ compraId: "c-04", operacionId: "op-1" });
    apiDelCobro();

    await renderConProveedores(<RetomarPago />);

    expect(await screen.findByText("El evento se canceló")).toBeTruthy();
    expect(screen.getByText(TEXTO)).toBeTruthy();
    expect(screen.queryByText("Tu pago se confirmó")).toBeNull();
  });

  it("el ícono del evento cancelado se ve sobre su fondo: usa el color 'sobreAcento', no el del tilde verde", async () => {
    apiDelCobro();
    await renderConProveedores(<HojaPago compra={COMPRA} onCerrar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole("button", { name: /^Pagar/ }));

    const circulo = await screen.findByRole("image", { name: "Evento cancelado" });
    const colores = resolverTema("claro", "light").colores;
    const coloresDeTexto = circulo
      .queryAll((nodo) => nodo.props.style)
      .map((nodo) => StyleSheet.flatten(nodo.props.style).color)
      .filter(Boolean);
    expect(coloresDeTexto).toContain(colores.sobreAcento);
    expect(coloresDeTexto).not.toContain(colores.sobreMarca);
  });

  it("si llega otra consulta de la operación mientras se mira la compra, el pago se resuelve una sola vez", async () => {
    apiDelCobro();
    const { promise: compraLista, resolve: responderCompra } = Promise.withResolvers();
    servidor.use(
      http.get(`${API}/compras/c-04`, async () => {
        await compraLista;
        return HttpResponse.json(CANCELADA);
      }),
    );
    const anuncio = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
    const vibracion = jest.spyOn(Haptics, "notificationAsync").mockImplementation(async () => {});
    const { queryClient } = await renderConProveedores(<HojaPago compra={COMPRA} onCerrar={jest.fn()} />);
    await fireEvent.press(await screen.findByRole("button", { name: /^Pagar/ }));
    await waitFor(() => expect(queryClient.getQueryState(["pagos", "op-1"])?.data?.estado).toBe("APROBADA"));

    // Un refetch por foco mientras se espera la compra.
    await act(() => queryClient.refetchQueries({ queryKey: ["pagos", "op-1"] }));
    // React Query avisa a la pantalla en el turno siguiente: se le da tiempo antes de responder la compra.
    await act(() => new Promise((listo) => setTimeout(listo, 50)));
    responderCompra();

    expect(await screen.findByText("El evento se canceló")).toBeTruthy();
    expect(vibracion).toHaveBeenCalledTimes(1);
    expect(
      anuncio.mock.calls.filter(([texto]) => texto === "El evento se canceló. Te devolvemos el dinero."),
    ).toHaveLength(1);
  });

  it("si aprobada la operación falla la consulta de la compra, igual dice 'Pago confirmado'", async () => {
    apiDelCobro();
    servidor.use(
      http.get(`${API}/compras/c-04`, () =>
        HttpResponse.json({ error: { codigo: "ERROR_INTERNO", mensaje: "Error interno" } }, { status: 500 }),
      ),
    );
    await renderConProveedores(<HojaPago compra={COMPRA} onCerrar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole("button", { name: /^Pagar/ }));

    expect(await screen.findByText("Pago confirmado")).toBeTruthy();
    expect(screen.queryByText("El evento se canceló")).toBeNull();
  });

  it("si se perdió la respuesta del cobro y la compra terminó reembolsada por el evento cancelado, no dice 'No llegamos a cobrarte'", async () => {
    apiDelCobro();
    servidor.use(
      http.post(`${API}/compras/c-04/pago`, () => HttpResponse.error()),
      http.get(`${API}/compras/c-04`, () =>
        HttpResponse.json({ ...CANCELADA, operacionPago: null, acciones: { pagar: false } }),
      ),
    );
    await renderConProveedores(<HojaPago compra={COMPRA} onCerrar={jest.fn()} />);

    await fireEvent.press(await screen.findByRole("button", { name: /^Pagar/ }));

    expect(await screen.findByText("El evento se canceló")).toBeTruthy();
    expect(screen.queryByText(/No llegamos a cobrarte/)).toBeNull();
  });
});
