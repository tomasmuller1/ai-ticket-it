import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";

import DetalleCompra from "../../src/app/compra/[id]/index";
import Comprar from "../../src/app/evento/[id]/comprar";
import { CompraCard } from "../../src/components/CompraCard";
import { conSesion, renderPantalla } from "../helpers/pantalla";
import { renderConProveedores } from "../helpers/render";
import { API, servidor } from "../helpers/servidor";

const GENERAL = {
  id: "t-general",
  nombre: "General",
  descripcion: "",
  precio: 0,
  cupo: 300,
  disponibles: 200,
};
const TALLER = {
  id: "t-taller",
  nombre: "Taller",
  descripcion: "",
  precio: 15000,
  cupo: 40,
  disponibles: 20,
};
const EVENTO = {
  id: "e-1",
  nombre: "Conferencia de prueba",
  categoria: { id: "conferencias", nombre: "Conferencias" },
  fecha: "2026-12-10T19:00:00-03:00",
  lugar: "UTN FRBA",
  imagen: "https://picsum.photos/1",
  precioDesde: 0,
  agotado: false,
  finalizado: false,
  organizador: { id: "u-tomas", nombre: "Tomás", puntaje: null, cantidadResenias: 0 },
  descripcion: "Charlas",
  multimedia: [],
  tiposEntrada: [GENERAL, TALLER],
  reseniasRecientes: [],
};
// Así responde la API una compra gratis: ya CONFIRMADA, sin plazo ni pago.
const GRATIS = {
  id: "c-01",
  estado: "CONFIRMADA",
  cantidad: 2,
  precioUnitario: 0,
  total: 0,
  codigoEntrada: "ABC12345",
  fechaCreacion: "2026-11-01T12:00:00-03:00",
  reservaVenceEn: null,
  reservaPlazoCumplido: false,
  reservaVencida: false,
  diasRestantes: 39,
  cantidadMensajes: 0,
  historial: [
    {
      estado: "CONFIRMADA",
      quien: { id: "u-sofia", nombre: "Sofía" },
      fechaHora: "2026-11-01T12:00:00-03:00",
    },
  ],
  resenia: null,
  operacionPago: null,
  comprador: { id: "u-sofia", nombre: "Sofía" },
  evento: { ...EVENTO, organizador: { id: "u-tomas", nombre: "Tomás" } },
  tipoEntrada: { id: "t-general", nombre: "General" },
  acciones: {
    pagar: false,
    cancelar: true,
    validar: false,
    reseniar: false,
    chatear: true,
    reintentarReembolso: false,
  },
};

const RUTAS = { index: () => null, "evento/[id]/comprar": Comprar, "compra/[id]/index": DetalleCompra };

// Sin handler de tarjetas a propósito: si se abriera la hoja de pago, su request haría fallar el test.
async function abrirComprar() {
  await conSesion();
  servidor.use(
    http.get(`${API}/eventos/e-1`, () => HttpResponse.json(EVENTO)),
    http.post(`${API}/compras`, () => HttpResponse.json(GRATIS, { status: 201 })),
    http.get(`${API}/compras/c-01`, () => HttpResponse.json(GRATIS)),
  );
  await renderPantalla(RUTAS, { initialUrl: "/evento/e-1/comprar" });
}

describe("Entradas gratis", () => {
  it("no pide pagar: ofrece obtenerlas y aclara que son gratis", async () => {
    await abrirComprar();

    expect(await screen.findByRole("button", { name: "Obtener 1 entrada" })).toBeTruthy();
    expect(screen.getByText("Es gratis: no tenés que pagar nada.")).toBeTruthy();
    expect(screen.queryByText(/pagás en el paso siguiente/)).toBeNull();
  });

  it("al elegir un tipo pago vuelve a ofrecer reservar y pagar", async () => {
    await abrirComprar();

    await fireEvent.press(await screen.findByRole("radio", { name: /^Taller/ }));

    expect(screen.getByRole("button", { name: "Reservar 1 entrada" })).toBeTruthy();
    expect(screen.getByText("Reservás ahora y pagás en el paso siguiente.")).toBeTruthy();
  });

  it("al obtenerlas abre la entrada confirmada, sin la hoja de pago, y avisa que ya las tiene", async () => {
    await abrirComprar();

    await fireEvent.press(await screen.findByRole("button", { name: "Obtener 1 entrada" }));

    await waitFor(() => expect(screen.getPathname()).toBe("/compra/c-01"));
    expect(await screen.findByText("¡Listo! Ya tenés tus entradas")).toBeTruthy();
    expect(screen.getByText("Son gratis: no hay nada que pagar.")).toBeTruthy();
    expect(await screen.findByLabelText(/^Estado: Confirmada/)).toBeTruthy();
    expect(screen.queryByText("Confirmá el pago")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
  });

  it("la entrada y el detalle muestran $ 0", async () => {
    await conSesion();
    servidor.use(http.get(`${API}/compras/c-01`, () => HttpResponse.json(GRATIS)));

    await renderPantalla(RUTAS, { initialUrl: "/compra/c-01" });

    await screen.findByLabelText(/^Estado: Confirmada/);
    // Total en la entrada, precio por entrada y total en el detalle.
    expect(screen.getAllByText(/^\$\s0$/).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText("Gratis")).toBeNull();
  });

  it("en Mis entradas muestra $ 0", async () => {
    await renderConProveedores(<CompraCard compra={GRATIS} />);

    expect(screen.getByText(/^2 × General, \$\s0$/)).toBeTruthy();
  });
});
