import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";

import { almacenamiento } from "../../src/api/almacenamiento";
import DetalleCompra from "../../src/app/compra/[id]/index";
import { CompraCard } from "../../src/components/CompraCard";
import { HojaPago } from "../../src/components/HojaPago";
import { RetomarPago } from "../../src/components/RetomarPago";
import { POLLING_PAGO } from "../../src/hooks/pago";
import { formato } from "../../src/utils/formato";
import { conSesion, renderPantalla, USUARIO } from "../helpers/pantalla";
import { renderConProveedores } from "../helpers/render";
import { API, servidor } from "../helpers/servidor";

const COMPRA = {
  id: "c-04",
  total: 52000,
  cantidad: 2,
  estado: "PENDIENTE",
  evento: { nombre: "Recital" },
  tipoEntrada: { nombre: "Campo" },
};
const TARJETA = { id: "t-1", marca: "Visa", ultimos4: "4242", vencimiento: "08/29", titular: "Sofía" };
const OTRA_TARJETA = { ...TARJETA, id: "t-2", ultimos4: "1111" };
const OPERACION = "op-1";
const URL_OPERACION = `${API}/compras/c-04/pago/${OPERACION}`;

const operacion = (estado, motivo = null) => ({
  operacionId: OPERACION,
  compraId: "c-04",
  estado,
  motivo,
  fechaCreacion: "2026-11-01T12:00:00-03:00",
  fechaResolucion: null,
});

// Registra las requests de pago y responde lo que cada test necesita.
function apiDePagos({
  resultados = ["APROBADA"],
  post = () => HttpResponse.json(operacion("PENDIENTE"), { status: 202 }),
} = {}) {
  const claves = [];
  const consultas = { cantidad: 0 };
  servidor.use(
    http.get(`${API}/usuarios/me/tarjetas`, () => HttpResponse.json([TARJETA, OTRA_TARJETA])),
    http.post(`${API}/compras/c-04/pago`, ({ request }) => {
      claves.push(request.headers.get("Idempotency-Key"));
      return post(claves.length);
    }),
    http.get(URL_OPERACION, () => {
      const resultado = resultados[Math.min(consultas.cantidad, resultados.length - 1)];
      consultas.cantidad += 1;
      return HttpResponse.json(typeof resultado === "string" ? operacion(resultado) : resultado);
    }),
  );
  return { claves, consultas };
}

async function abrirHoja() {
  const onCerrar = jest.fn();
  const resultado = await renderConProveedores(<HojaPago compra={COMPRA} onCerrar={onCerrar} />);
  const botonPagar = await screen.findByRole("button", { name: /^Pagar/ });
  return { ...resultado, onCerrar, botonPagar };
}

async function pagar() {
  const hoja = await abrirHoja();
  await fireEvent.press(hoja.botonPagar);
  return hoja;
}

beforeEach(() => {
  jest.replaceProperty(POLLING_PAGO, "intervaloMs", 5);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Hoja de pago", () => {
  it("camino feliz: consulta hasta que la pasarela aprueba y muestra el tilde", async () => {
    const { consultas } = apiDePagos({ resultados: ["PENDIENTE", "PENDIENTE", "APROBADA"] });

    await pagar();

    expect(await screen.findByText("Pago confirmado")).toBeTruthy();
    expect(consultas.cantidad).toBe(3);
  });

  it("deja de consultar cuando la operación se resolvió", async () => {
    const { consultas } = apiDePagos({ resultados: ["APROBADA"] });

    await pagar();
    await screen.findByText("Pago confirmado");
    await new Promise((resolver) => setTimeout(resolver, 60));

    expect(consultas.cantidad).toBe(1);
  });

  it("manda una clave de idempotencia", async () => {
    const { claves } = apiDePagos();

    await pagar();
    await screen.findByText("Pago confirmado");

    expect(claves[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("es cautiva: mientras cobra no se puede cerrar", async () => {
    apiDePagos({ resultados: ["PENDIENTE"] });
    jest.replaceProperty(POLLING_PAGO, "intervaloMs", 10_000);

    await pagar();

    expect(await screen.findByText("Procesando el pago")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cerrar el pago" })).toBeNull();
  });

  it("si la tarjeta se rechaza, vuelve al resumen con el motivo y deja elegir otra", async () => {
    const { claves } = apiDePagos({
      resultados: [
        operacion("RECHAZADA", { codigo: "PAGO_RECHAZADO", mensaje: "La tarjeta fue rechazada." }),
      ],
    });

    await pagar();

    expect(await screen.findByText("La tarjeta fue rechazada.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Cambiar tarjeta/ })).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: /^Pagar/ }));
    await waitFor(() => expect(claves).toHaveLength(2));
    expect(claves[1]).not.toBe(claves[0]);
  });

  it("si la pasarela está caída, cierra la hoja y avisa que la reserva sigue en pie", async () => {
    apiDePagos({
      resultados: [operacion("RECHAZADA", { codigo: "PASARELA_NO_DISPONIBLE", mensaje: "Sin pagos" })],
    });

    const { onCerrar } = await pagar();

    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    expect(await screen.findByText("No pudimos cobrar")).toBeTruthy();
    expect(screen.getByText(/Tu reserva sigue en pie/)).toBeTruthy();
  });

  it("al llegar al máximo de intentos sale con un mensaje honesto", async () => {
    jest.replaceProperty(POLLING_PAGO, "maxConsultas", 2);
    apiDePagos({ resultados: ["PENDIENTE"] });

    const { onCerrar } = await pagar();

    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    expect(await screen.findByText("Tu pago sigue en proceso")).toBeTruthy();
    expect(screen.getByText("Lo vas a ver en Mis entradas.")).toBeTruthy();
  });

  it("guarda el pago en curso para poder retomarlo y lo olvida al resolverse", async () => {
    jest.replaceProperty(POLLING_PAGO, "intervaloMs", 50);
    apiDePagos({ resultados: ["PENDIENTE", "APROBADA"] });

    await pagar();

    await waitFor(async () =>
      expect(await almacenamiento.obtenerPagoEnCurso()).toEqual({ compraId: "c-04", operacionId: OPERACION }),
    );
    await screen.findByText("Pago confirmado");
    await waitFor(async () => expect(await almacenamiento.obtenerPagoEnCurso()).toBeNull());
  });

  it("si la app se cierra mientras se resuelve, conserva el pago en curso", async () => {
    jest.replaceProperty(POLLING_PAGO, "intervaloMs", 10_000);
    apiDePagos({ resultados: ["PENDIENTE"] });

    const { unmount } = await pagar();
    await screen.findByText("Procesando el pago");
    await waitFor(async () =>
      expect((await almacenamiento.obtenerPagoEnCurso())?.operacionId).toBe(OPERACION),
    );
    await unmount();

    expect(await almacenamiento.obtenerPagoEnCurso()).toEqual({ compraId: "c-04", operacionId: OPERACION });
  });

  describe("resultado incierto: el pedido se fue, pero la respuesta no llegó", () => {
    const sinRespuesta = () => HttpResponse.error();

    it("si el cobro había salido, muestra el pago confirmado", async () => {
      apiDePagos({ post: sinRespuesta });
      servidor.use(
        http.get(`${API}/compras/c-04`, () =>
          HttpResponse.json({ ...COMPRA, estado: "CONFIRMADA", operacionPago: operacion("APROBADA") }),
        ),
      );

      await pagar();

      expect(await screen.findByText("Pago confirmado")).toBeTruthy();
      expect(screen.queryByText(/No hay conexión/)).toBeNull();
    });

    it("si el cobro sigue en proceso, retoma el polling de esa operación", async () => {
      apiDePagos({ post: sinRespuesta, resultados: ["PENDIENTE", "APROBADA"] });
      servidor.use(
        http.get(`${API}/compras/c-04`, () =>
          HttpResponse.json({ ...COMPRA, operacionPago: operacion("PENDIENTE") }),
        ),
      );

      await pagar();

      expect(await screen.findByText("Pago confirmado")).toBeTruthy();
    });

    it("si no se llegó a cobrar, lo dice y reintenta con la misma clave", async () => {
      const { claves } = apiDePagos({ post: sinRespuesta });
      servidor.use(
        http.get(`${API}/compras/c-04`, () => HttpResponse.json({ ...COMPRA, operacionPago: null })),
      );

      await pagar();

      expect(await screen.findByText(/No llegamos a cobrarte/)).toBeTruthy();
      await fireEvent.press(screen.getByRole("button", { name: /^Pagar/ }));
      await waitFor(() => expect(claves).toHaveLength(2));
      expect(claves[1]).toBe(claves[0]);
    });

    it("si tampoco se puede consultar la compra, no dice que falló", async () => {
      apiDePagos({ post: sinRespuesta });
      servidor.use(http.get(`${API}/compras/c-04`, () => HttpResponse.error()));

      const { onCerrar } = await pagar();

      await waitFor(() => expect(onCerrar).toHaveBeenCalled());
      expect(await screen.findByText("No pudimos confirmar tu pago")).toBeTruthy();
      expect(screen.getByText(/Revisá Mis entradas/)).toBeTruthy();
      expect(await almacenamiento.obtenerPagoEnCurso()).toMatchObject({ compraId: "c-04" });
    });
  });

  it("si ya hay un pago en proceso (por otro intento), lo espera en lugar de fallar", async () => {
    apiDePagos({
      post: () =>
        HttpResponse.json(
          { error: { codigo: "PAGO_EN_PROCESO", mensaje: "Hay un pago en proceso" } },
          { status: 409 },
        ),
      resultados: ["APROBADA"],
    });
    servidor.use(
      http.get(`${API}/compras/c-04`, () =>
        HttpResponse.json({ ...COMPRA, operacionPago: operacion("PENDIENTE") }),
      ),
    );

    await pagar();

    expect(await screen.findByText("Pago confirmado")).toBeTruthy();
  });

  it("si se perdió la respuesta y la reserva venció, no dice que sigue en pie", async () => {
    apiDePagos({ post: () => HttpResponse.error() });
    servidor.use(
      http.get(`${API}/compras/c-04`, () =>
        HttpResponse.json({
          ...COMPRA,
          estado: "CANCELADA",
          reservaVencida: true,
          operacionPago: null,
          acciones: { pagar: false },
        }),
      ),
    );

    await pagar();

    expect(
      await screen.findByText("Tu reserva venció porque no se pagó a tiempo. Las entradas se liberaron."),
    ).toBeTruthy();
    expect(screen.queryByText(/sigue en pie/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
  });

  it("la hoja de una compra con reservaVencida no ofrece Pagar", async () => {
    const compra = { ...COMPRA, reservaVencida: true, acciones: { pagar: false } };

    await renderConProveedores(<HojaPago compra={compra} onCerrar={jest.fn()} />);

    expect(
      await screen.findByText("Tu reserva venció porque no se pagó a tiempo. Las entradas se liberaron."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
  });

  it("un error de la API que no es incierto se muestra en la hoja", async () => {
    apiDePagos({
      post: () =>
        HttpResponse.json(
          { error: { codigo: "EVENTO_FINALIZADO", mensaje: "El evento ya se realizó" } },
          { status: 409 },
        ),
    });

    await pagar();

    expect(await screen.findByText("El evento ya se realizó")).toBeTruthy();
    expect(await almacenamiento.obtenerPagoEnCurso()).toBeNull();
  });
});

describe("Retomar un pago al abrir la app", () => {
  it("sin pago en curso no hace nada", async () => {
    await renderConProveedores(<RetomarPago />);

    expect(screen.queryByText(/pago/i)).toBeNull();
  });

  it("si se aprobó mientras la app estaba cerrada, lo avisa y lo olvida", async () => {
    await almacenamiento.guardarPagoEnCurso({ compraId: "c-04", operacionId: OPERACION });
    apiDePagos({ resultados: ["APROBADA"] });

    await renderConProveedores(<RetomarPago />);

    expect(await screen.findByText("Tu pago se confirmó")).toBeTruthy();
    await waitFor(async () => expect(await almacenamiento.obtenerPagoEnCurso()).toBeNull());
  });

  it("si sigue pendiente, sigue consultando hasta tener el resultado", async () => {
    await almacenamiento.guardarPagoEnCurso({ compraId: "c-04", operacionId: OPERACION });
    apiDePagos({ resultados: ["PENDIENTE", "APROBADA"] });

    await renderConProveedores(<RetomarPago />);

    expect(await screen.findByText("Tu pago se confirmó")).toBeTruthy();
  });

  it("si se rechazó, avisa el motivo", async () => {
    await almacenamiento.guardarPagoEnCurso({ compraId: "c-04", operacionId: OPERACION });
    apiDePagos({
      resultados: [
        operacion("RECHAZADA", { codigo: "PAGO_RECHAZADO", mensaje: "La tarjeta fue rechazada." }),
      ],
    });
    servidor.use(
      http.get(`${API}/compras/c-04`, () =>
        HttpResponse.json({ ...COMPRA, reservaVencida: false, acciones: { pagar: true } }),
      ),
    );

    await renderConProveedores(<RetomarPago />);

    expect(await screen.findByText("No pudimos cobrar")).toBeTruthy();
    expect(screen.getByText(/La tarjeta fue rechazada. Tu reserva sigue en pie/)).toBeTruthy();
    await waitFor(async () => expect(await almacenamiento.obtenerPagoEnCurso()).toBeNull());
  });

  it("al retomar un pago rechazado de una reserva vencida, no dice que sigue en pie", async () => {
    await almacenamiento.guardarPagoEnCurso({ compraId: "c-04", operacionId: OPERACION });
    apiDePagos({
      resultados: [
        operacion("RECHAZADA", { codigo: "PAGO_RECHAZADO", mensaje: "La tarjeta fue rechazada." }),
      ],
    });
    servidor.use(
      http.get(`${API}/compras/c-04`, () =>
        HttpResponse.json({
          ...COMPRA,
          estado: "CANCELADA",
          reservaVencida: true,
          acciones: { pagar: false },
        }),
      ),
    );

    await renderConProveedores(<RetomarPago />);

    expect(await screen.findByText("No pudimos cobrar")).toBeTruthy();
    expect(screen.queryByText(/sigue en pie/)).toBeNull();
    expect(screen.getByText(/La reserva venció/)).toBeTruthy();
  });

  it("si no se llegó a saber el id de la operación, la busca en la compra", async () => {
    await almacenamiento.guardarPagoEnCurso({ compraId: "c-04", operacionId: null });
    apiDePagos({ resultados: ["APROBADA"] });
    servidor.use(
      http.get(`${API}/compras/c-04`, () =>
        HttpResponse.json({ ...COMPRA, operacionPago: operacion("PENDIENTE") }),
      ),
    );

    await renderConProveedores(<RetomarPago />);

    expect(await screen.findByText("Tu pago se confirmó")).toBeTruthy();
  });

  it("si la compra nunca llegó a tener un cobro, olvida el pago en curso sin molestar", async () => {
    await almacenamiento.guardarPagoEnCurso({ compraId: "c-04", operacionId: null });
    servidor.use(
      http.get(`${API}/compras/c-04`, () => HttpResponse.json({ ...COMPRA, operacionPago: null })),
    );

    await renderConProveedores(<RetomarPago />);

    await waitFor(async () => expect(await almacenamiento.obtenerPagoEnCurso()).toBeNull());
    expect(screen.queryByText(/pago/i)).toBeNull();
  });

  it("si la operación ya no existe (el backend se reinició), la olvida", async () => {
    await almacenamiento.guardarPagoEnCurso({ compraId: "c-04", operacionId: OPERACION });
    servidor.use(
      http.get(URL_OPERACION, () =>
        HttpResponse.json({ error: { codigo: "NO_ENCONTRADO", mensaje: "No" } }, { status: 404 }),
      ),
    );

    await renderConProveedores(<RetomarPago />);

    await waitFor(async () => expect(await almacenamiento.obtenerPagoEnCurso()).toBeNull());
  });
});

describe("Compra con un pago en proceso", () => {
  const COMPRA_COMPLETA = {
    ...COMPRA,
    codigoEntrada: "ABC12345",
    precioUnitario: 26000,
    fechaCreacion: "2026-11-01T12:00:00-03:00",
    diasRestantes: null,
    cantidadMensajes: 0,
    historial: [],
    resenia: null,
    comprador: { id: "u-sofia", nombre: "Sofía" },
    evento: {
      id: "e-1",
      nombre: "Recital",
      fecha: "2026-12-10T21:00:00-03:00",
      lugar: "Estadio",
      imagen: null,
      organizador: { id: "u-martin", nombre: "Martín" },
    },
    tipoEntrada: { id: "t-1", nombre: "Campo" },
    acciones: {
      pagar: false,
      cancelar: false,
      validar: false,
      reseniar: false,
      chatear: true,
      reintentarReembolso: false,
    },
    operacionPago: operacion("PENDIENTE"),
  };
  const RUTAS = { index: () => null, "compra/[id]/index": DetalleCompra };

  it("lo muestra, no ofrece pagar de nuevo y se actualiza solo al confirmarse", async () => {
    jest.replaceProperty(POLLING_PAGO, "intervaloMs", 20);
    await conSesion();
    let respuesta = COMPRA_COMPLETA;
    servidor.use(http.get(`${API}/compras/c-04`, () => HttpResponse.json(respuesta)));

    await renderPantalla(RUTAS, { initialUrl: "/compra/c-04" });

    expect(await screen.findByText(/Estamos procesando tu pago/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();

    respuesta = { ...COMPRA_COMPLETA, estado: "CONFIRMADA", operacionPago: operacion("APROBADA") };

    await waitFor(() => expect(screen.queryByText(/Estamos procesando tu pago/)).toBeNull());
  });

  it("Mis entradas también lo muestra en la tarjeta de la compra", async () => {
    await renderConProveedores(<CompraCard compra={COMPRA_COMPLETA} />);

    expect(screen.getByText("Pago en proceso")).toBeTruthy();
  });
});

describe("Plazo de la reserva", () => {
  const RESERVA = {
    ...COMPRA,
    codigoEntrada: "ABC12345",
    precioUnitario: 26000,
    fechaCreacion: "2026-11-01T12:00:00-03:00",
    reservaVenceEn: "2026-11-01T12:15:00-03:00",
    reservaVencida: false,
    diasRestantes: null,
    cantidadMensajes: 0,
    historial: [],
    resenia: null,
    comprador: { id: "u-sofia", nombre: "Sofía" },
    evento: {
      id: "e-1",
      nombre: "Recital",
      fecha: "2026-12-10T21:00:00-03:00",
      lugar: "Estadio",
      imagen: null,
      organizador: { id: "u-martin", nombre: "Martín" },
    },
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
  const RUTAS = { index: () => null, "compra/[id]/index": DetalleCompra };

  async function abrirCompra(compra) {
    await conSesion();
    servidor.use(http.get(`${API}/compras/c-04`, () => HttpResponse.json(compra)));
    await renderPantalla(RUTAS, { initialUrl: "/compra/c-04" });
  }

  it("muestra hasta qué hora vale la reserva", async () => {
    await abrirCompra(RESERVA);

    expect(
      await screen.findByText(
        `Tus entradas están reservadas hasta las ${formato.hora(RESERVA.reservaVenceEn)}. Pagalas antes de esa hora o se liberan.`,
      ),
    ).toBeTruthy();
  });

  it("sin plazo, muestra el texto de siempre", async () => {
    await abrirCompra({ ...RESERVA, reservaVenceEn: null });

    expect(
      await screen.findByText("Tus entradas están reservadas. Pagalas para confirmar la compra."),
    ).toBeTruthy();
  });

  it("explica que la reserva venció", async () => {
    await abrirCompra({
      ...RESERVA,
      estado: "CANCELADA",
      reservaVenceEn: null,
      reservaVencida: true,
      acciones: { ...RESERVA.acciones, pagar: false, cancelar: false },
    });

    expect(
      await screen.findByText("Tu reserva venció porque no se pagó a tiempo. Las entradas se liberaron."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
  });

  // La hora límite se mantiene siempre un segundo adelante del reloj: el test no depende de la velocidad de la
  // máquina. Lo que cambia es lo que responde la API, que es lo que dispara la nueva consulta.
  const enPlazo = () => ({ ...RESERVA, reservaVenceEn: new Date(Date.now() + 1000).toISOString() });
  const SIN_PAGAR_A_TIEMPO = /Tu reserva venció porque no se pagó a tiempo/;
  const noPagable = (cambios = {}) => ({
    ...RESERVA,
    reservaVenceEn: null,
    reservaVencida: false,
    acciones: { ...RESERVA.acciones, pagar: false, cancelar: false },
    ...cambios,
  });

  it("al llegar la hora vuelve a pedir la compra y deja de ofrecer Pagar", async () => {
    let compra = enPlazo;
    await conSesion();
    servidor.use(http.get(`${API}/compras/c-04`, () => HttpResponse.json(compra())));

    await renderPantalla(RUTAS, { initialUrl: "/compra/c-04" });

    expect(await screen.findByRole("button", { name: /^Pagar/ })).toBeTruthy();
    compra = () => noPagable({ estado: "CANCELADA", reservaVencida: true });
    expect(await screen.findByText(SIN_PAGAR_A_TIEMPO, {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
  });

  describe("con la hoja de pago abierta desde la compra", () => {
    let compra;

    // Abre la compra y la hoja. `compra` se puede cambiar durante el flujo: la API devuelve lo último.
    async function abrirHoja() {
      compra = enPlazo;
      await conSesion();
      servidor.use(http.get(`${API}/compras/c-04`, () => HttpResponse.json(compra())));
      await renderPantalla(RUTAS, { initialUrl: "/compra/c-04" });
      await fireEvent.press(await screen.findByRole("button", { name: /^Pagar/ }));
      await screen.findByText("Pago simulado: no se cobra dinero real.");
    }
    const tocarPagar = async () => {
      const botones = screen.getAllByRole("button", { name: /^Pagar/ });
      await fireEvent.press(botones.at(-1));
    };
    const error409 = (codigo, mensaje) => HttpResponse.json({ error: { codigo, mensaje } }, { status: 409 });

    it("un rechazo muestra su motivo aunque la compra se refresque con acciones.pagar false", async () => {
      apiDePagos({
        resultados: [
          operacion("RECHAZADA", { codigo: "PAGO_RECHAZADO", mensaje: "La tarjeta fue rechazada." }),
        ],
      });
      await abrirHoja();
      compra = () => noPagable({ operacionPago: operacion("RECHAZADA") });

      await tocarPagar();

      expect(await screen.findByText("La tarjeta fue rechazada.")).toBeTruthy();
      expect(screen.queryByText("Reserva vencida")).toBeNull();
      expect(screen.queryByText(SIN_PAGAR_A_TIEMPO)).toBeNull();
    });

    it("un error EVENTO_FINALIZADO no se reemplaza por el texto de reserva vencida", async () => {
      apiDePagos({ post: () => error409("EVENTO_FINALIZADO", "El evento ya se realizó") });
      await abrirHoja();
      compra = () => noPagable();

      await tocarPagar();

      expect(await screen.findByText("El evento ya se realizó")).toBeTruthy();
      expect(screen.queryByText(SIN_PAGAR_A_TIEMPO)).toBeNull();
    });

    it("una compra pagada desde otro dispositivo no dice que no se pagó a tiempo", async () => {
      apiDePagos({
        post: () => error409("TRANSICION_INVALIDA", "No se puede pagar una compra CONFIRMADA"),
      });
      await abrirHoja();
      compra = () => noPagable({ estado: "CONFIRMADA" });

      await tocarPagar();

      expect(await screen.findByText("No se puede pagar una compra CONFIRMADA")).toBeTruthy();
      expect(screen.queryByText(SIN_PAGAR_A_TIEMPO)).toBeNull();
    });

    describe("al cerrar el aviso de reserva vencida", () => {
      const vencida = () => noPagable({ reservaVenceEn: "2026-11-01T12:15:00-03:00", reservaVencida: true });

      async function abrirYEsperarElAviso() {
        const { claves } = apiDePagos();
        await abrirHoja();
        compra = vencida;
        await screen.findByText("Reserva vencida", {}, { timeout: 5000 });
        return claves;
      }

      it("no vuelve a ofrecer Pagar mientras la hoja sale (botón Cerrar)", async () => {
        const claves = await abrirYEsperarElAviso();

        await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));

        expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
        expect(claves).toHaveLength(0);
      });

      it("no vuelve a ofrecer Pagar mientras la hoja sale (cruz)", async () => {
        const claves = await abrirYEsperarElAviso();

        await fireEvent.press(screen.getAllByRole("button", { name: "Cerrar el pago" })[0]);

        expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
        expect(claves).toHaveLength(0);
      });
    });

    it("en la vista de elegir tarjeta no se reemplaza lo que la persona está haciendo", async () => {
      apiDePagos();
      await abrirHoja();
      await fireEvent.press(screen.getByRole("button", { name: /Cambiar tarjeta/ }));
      await screen.findByText("Agregar otra tarjeta");

      compra = () => noPagable({ reservaVenceEn: "2026-11-01T12:15:00-03:00", reservaVencida: true });
      // La pantalla de atrás ya mostró el aviso: la compra se refrescó.
      await screen.findByText(SIN_PAGAR_A_TIEMPO, {}, { timeout: 5000 });

      expect(screen.getByText("Agregar otra tarjeta")).toBeTruthy();
      expect(screen.queryByText("Reserva vencida")).toBeNull();
      // Al volver al resumen, ahí sí se le explica.
      await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
      expect(await screen.findByText("Reserva vencida")).toBeTruthy();
    });

    describe("si se perdió la respuesta y la compra sigue PENDIENTE con el plazo cumplido", () => {
      const plazoCumplido = () =>
        noPagable({
          reservaVenceEn: "2026-11-01T12:15:00-03:00",
          reservaVencida: true,
          operacionPago: null,
        });

      it("no dice que venció y permite reintentar con la misma clave", async () => {
        const { claves } = apiDePagos({
          post: (n) =>
            n === 1 ? HttpResponse.error() : HttpResponse.json(operacion("PENDIENTE"), { status: 202 }),
          resultados: ["APROBADA"],
        });
        await abrirHoja();
        compra = plazoCumplido;

        await tocarPagar();

        expect(await screen.findByText(/No llegamos a cobrarte/)).toBeTruthy();
        expect(screen.queryByText("Reserva vencida")).toBeNull();
        // El POST cortado todavía puede llegar al servidor: el pago en curso no se olvida.
        expect(await almacenamiento.obtenerPagoEnCurso()).toMatchObject({ compraId: "c-04" });
        await tocarPagar();
        await waitFor(() => expect(claves).toHaveLength(2));
        expect(claves[1]).toBe(claves[0]);
      });

      it("si ese reintento recibe RESERVA_VENCIDA, recién ahí dice que venció", async () => {
        apiDePagos({
          post: (n) =>
            n === 1
              ? HttpResponse.error()
              : error409("RESERVA_VENCIDA", "Tu reserva venció. Volvé a reservar si todavía querés ir."),
        });
        await abrirHoja();
        compra = plazoCumplido;

        await tocarPagar();
        await screen.findByText(/No llegamos a cobrarte/);
        await tocarPagar();

        expect(await screen.findByText("Reserva vencida")).toBeTruthy();
        expect(screen.getByText("Tu reserva venció. Volvé a reservar si todavía querés ir.")).toBeTruthy();
        expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
      });
    });

    it("con la hoja abierta en el resumen, al vencer el plazo deja de ofrecer Pagar y explica que venció", async () => {
      apiDePagos();
      await abrirHoja();

      compra = () => noPagable({ reservaVenceEn: "2026-11-01T12:15:00-03:00", reservaVencida: true });

      expect(await screen.findByText("Reserva vencida", {}, { timeout: 5000 })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
      expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();
    });
  });

  it("al organizador le habla de la reserva de otra persona", async () => {
    await conSesion({ ...USUARIO, id: "u-martin", nombre: "Martín" });
    servidor.use(
      http.get(`${API}/compras/c-04`, () =>
        HttpResponse.json({
          ...RESERVA,
          estado: "CANCELADA",
          reservaVenceEn: null,
          reservaVencida: true,
          acciones: { ...RESERVA.acciones, pagar: false, cancelar: false },
        }),
      ),
    );

    await renderPantalla(RUTAS, { initialUrl: "/compra/c-04" });

    expect(await screen.findByText("La reserva venció sin pagarse. Las entradas se liberaron.")).toBeTruthy();
    expect(screen.queryByText(/Tu reserva venció/)).toBeNull();
  });

  it("si la reserva vence mientras paga, lo explica en la hoja", async () => {
    apiDePagos({
      post: () =>
        HttpResponse.json(
          {
            error: {
              codigo: "RESERVA_VENCIDA",
              mensaje: "Tu reserva venció. Volvé a reservar si todavía querés ir.",
            },
          },
          { status: 409 },
        ),
    });

    await pagar();

    expect(await screen.findByText("Tu reserva venció. Volvé a reservar si todavía querés ir.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
  });
});
