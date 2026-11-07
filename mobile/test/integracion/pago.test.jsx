import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { AccessibilityInfo, Platform } from "react-native";

import { almacenamiento } from "../../src/api/almacenamiento";
import DetalleCompra from "../../src/app/compra/[id]/index";
import { CompraCard } from "../../src/components/CompraCard";
import { HojaPago } from "../../src/components/HojaPago";
import { RetomarPago } from "../../src/components/RetomarPago";
import { CONSULTAS_DE_COMPRA } from "../../src/hooks/compras";
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
const RESERVA_VENCIDA = "Tu reserva venció porque no se pagó a tiempo. Las entradas se liberaron.";
const PLAZO_CUMPLIDO =
  "Se terminó el plazo para pagar esta reserva. Si tu pago ya estaba en camino, lo vas a ver acá; si no, las entradas se liberan en unos minutos.";
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
  it("mientras cargan las tarjetas no pide agregar una", async () => {
    const { promise: tarjetasListas, resolve: responderTarjetas } = Promise.withResolvers();
    servidor.use(
      http.get(`${API}/usuarios/me/tarjetas`, async () => {
        await tarjetasListas;
        return HttpResponse.json([TARJETA]);
      }),
    );

    await renderConProveedores(<HojaPago compra={COMPRA} onCerrar={jest.fn()} />);

    expect(screen.getByText("Confirmá el pago")).toBeTruthy();
    expect(screen.queryByText("Agregá una tarjeta")).toBeNull();
    responderTarjetas();
    expect(await screen.findByRole("button", { name: /^Pagar/ })).toBeTruthy();
  });

  it("sin tarjetas guardadas, al terminar de cargar pide agregar una", async () => {
    servidor.use(http.get(`${API}/usuarios/me/tarjetas`, () => HttpResponse.json([])));

    await renderConProveedores(<HojaPago compra={COMPRA} onCerrar={jest.fn()} />);

    expect(await screen.findByText("Agregá una tarjeta")).toBeTruthy();
  });

  it("el resumen muestra hasta qué hora vale la reserva", async () => {
    apiDePagos();
    const reservaVenceEn = "2026-11-01T12:15:00-03:00";

    await renderConProveedores(<HojaPago compra={{ ...COMPRA, reservaVenceEn }} onCerrar={jest.fn()} />);

    expect(await screen.findByText(`Reservada hasta las ${formato.hora(reservaVenceEn)}`)).toBeTruthy();
  });

  it("sin plazo, el resumen no habla de ninguna hora", async () => {
    apiDePagos();

    await renderConProveedores(
      <HojaPago compra={{ ...COMPRA, reservaVenceEn: null }} onCerrar={jest.fn()} />,
    );

    await screen.findByRole("button", { name: /^Pagar/ });
    expect(screen.queryByText(/Reservada hasta/)).toBeNull();
  });

  it("camino feliz: consulta hasta que la pasarela aprueba y muestra el tilde", async () => {
    const { consultas } = apiDePagos({ resultados: ["PENDIENTE", "PENDIENTE", "APROBADA"] });

    await pagar();

    expect(await screen.findByText("Pago confirmado")).toBeTruthy();
    expect(consultas.cantidad).toBe(3);
  });

  it("al resolverse refresca las notificaciones: llega el aviso del resultado", async () => {
    apiDePagos({ resultados: ["APROBADA"] });
    const { queryClient, botonPagar } = await abrirHoja();
    queryClient.setQueryData(["notificaciones", "resumen"], { noLeidas: 0 });

    await fireEvent.press(botonPagar);
    await screen.findByText("Pago confirmado");

    expect(queryClient.getQueryState(["notificaciones", "resumen"]).isInvalidated).toBe(true);
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

    it("si la API ofrece pagar, dice que la reserva sigue en pie", async () => {
      apiDePagos({ post: sinRespuesta });
      servidor.use(
        http.get(`${API}/compras/c-04`, () =>
          HttpResponse.json({ ...COMPRA, operacionPago: null, acciones: { pagar: true } }),
        ),
      );

      await pagar();

      expect(
        await screen.findByText("No llegamos a cobrarte. Tu reserva sigue en pie: probá de nuevo."),
      ).toBeTruthy();
    });

    it("si la API no dice que se puede pagar, no promete que la reserva sigue en pie", async () => {
      apiDePagos({ post: sinRespuesta });
      servidor.use(
        http.get(`${API}/compras/c-04`, () => HttpResponse.json({ ...COMPRA, operacionPago: null })),
      );

      await pagar();

      expect(await screen.findByText("No llegamos a cobrarte. Probá de nuevo.")).toBeTruthy();
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
      await screen.findByText("No llegamos a cobrarte y la reserva venció. Las entradas se liberaron."),
    ).toBeTruthy();
    expect(screen.queryByText(/sigue en pie/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
  });

  it("la hoja de una compra con reservaVencida no ofrece Pagar", async () => {
    apiDePagos();
    const compra = { ...COMPRA, estado: "CANCELADA", reservaVencida: true, acciones: { pagar: false } };

    await renderConProveedores(<HojaPago compra={compra} onCerrar={jest.fn()} />);

    expect(await screen.findByText(RESERVA_VENCIDA)).toBeTruthy();
    expect(screen.getByText("Reserva vencida")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
  });

  it("la hoja de una compra con el plazo cumplido no ofrece Pagar y no dice que venció", async () => {
    apiDePagos();
    const compra = { ...COMPRA, reservaPlazoCumplido: true, acciones: { pagar: false } };

    await renderConProveedores(<HojaPago compra={compra} onCerrar={jest.fn()} />);

    expect(await screen.findByText(PLAZO_CUMPLIDO)).toBeTruthy();
    expect(screen.getByText("Se terminó el plazo")).toBeTruthy();
    expect(screen.queryByText(/venció|vencida/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();
  });

  describe("el aviso de que ya no se puede pagar se anuncia al lector", () => {
    let anuncio;
    const compraVencida = { ...COMPRA, estado: "CANCELADA", reservaVencida: true };
    const compraConPlazoCumplido = { ...COMPRA, reservaPlazoCumplido: true };

    beforeEach(() => {
      apiDePagos();
      anuncio = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
      anuncio.mockClear();
    });

    it.each([
      ["la reserva vencida", compraVencida, RESERVA_VENCIDA],
      ["el plazo cumplido", compraConPlazoCumplido, PLAZO_CUMPLIDO],
    ])("en iOS anuncia %s", async (_, compra, texto) => {
      jest.replaceProperty(Platform, "OS", "ios");

      await renderConProveedores(<HojaPago compra={compra} onCerrar={jest.fn()} />);
      await screen.findByText(texto);

      expect(anuncio).toHaveBeenCalledWith(texto);
    });

    it("en Android no se anuncia a mano, para que no se lea dos veces", async () => {
      jest.replaceProperty(Platform, "OS", "android");

      await renderConProveedores(<HojaPago compra={compraVencida} onCerrar={jest.fn()} />);
      await screen.findByText(RESERVA_VENCIDA);

      expect(anuncio).not.toHaveBeenCalledWith(RESERVA_VENCIDA);
    });
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

  it("al retomar un pago rechazado con el plazo cumplido, no dice que venció ni que sigue en pie", async () => {
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
          reservaPlazoCumplido: true,
          reservaVencida: false,
          acciones: { pagar: false },
        }),
      ),
    );

    await renderConProveedores(<RetomarPago />);

    expect(await screen.findByText("No pudimos cobrar")).toBeTruthy();
    expect(screen.getByText("La tarjeta fue rechazada.")).toBeTruthy();
    expect(screen.queryByText(/sigue en pie|venció/)).toBeNull();
  });

  it("al retomar un pago rechazado, si la API no dice que se puede pagar, no promete que sigue en pie", async () => {
    await almacenamiento.guardarPagoEnCurso({ compraId: "c-04", operacionId: OPERACION });
    apiDePagos({
      resultados: [
        operacion("RECHAZADA", { codigo: "PAGO_RECHAZADO", mensaje: "La tarjeta fue rechazada." }),
      ],
    });
    servidor.use(http.get(`${API}/compras/c-04`, () => HttpResponse.json({ ...COMPRA })));

    await renderConProveedores(<RetomarPago />);

    expect(await screen.findByText("La tarjeta fue rechazada.")).toBeTruthy();
    expect(screen.queryByText(/sigue en pie/)).toBeNull();
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
    reservaPlazoCumplido: false,
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
  const PLAZO_CUMPLIDO_ORGANIZADOR =
    "Se terminó el plazo para pagar esta reserva. Si no llega el pago, las entradas se liberan en unos minutos.";

  // Como responde la API: con el plazo cumplido la compra sigue PENDIENTE y se puede cancelar.
  const conPlazoCumplido = (cambios = {}) => ({
    ...RESERVA,
    reservaPlazoCumplido: true,
    acciones: { ...RESERVA.acciones, pagar: false },
    ...cambios,
  });
  // Recién cuando el sistema la cancela, la reserva venció.
  const yaVencida = (cambios = {}) => ({
    ...RESERVA,
    estado: "CANCELADA",
    reservaVenceEn: null,
    reservaVencida: true,
    acciones: { ...RESERVA.acciones, pagar: false, cancelar: false },
    ...cambios,
  });

  // Las pruebas no esperan el mínimo real entre consultas: la hora límite está a un segundo.
  beforeEach(() => {
    jest.replaceProperty(CONSULTAS_DE_COMPRA, "minimoMs", 1000);
  });

  async function abrirCompra(compra, usuario = USUARIO) {
    await conSesion(usuario);
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

  it("con la reserva realmente vencida dice que venció", async () => {
    await abrirCompra(yaVencida());

    expect(await screen.findByText(RESERVA_VENCIDA)).toBeTruthy();
    expect(screen.queryByText(/Se terminó el plazo/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
  });

  it.each([
    ["comprador", USUARIO, PLAZO_CUMPLIDO],
    ["organizador", { ...USUARIO, id: "u-martin", nombre: "Martín" }, PLAZO_CUMPLIDO_ORGANIZADOR],
  ])(
    "con el plazo cumplido muestra el texto neutro, también al organizador (%s)",
    async (_, usuario, texto) => {
      await abrirCompra(conPlazoCumplido(), usuario);

      expect(await screen.findByText(texto)).toBeTruthy();
      expect(screen.queryByText(/venció|se liberaron/)).toBeNull();
      expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
      expect(screen.getByLabelText("Estado: Pendiente de pago")).toBeTruthy();
    },
  );

  it("con el plazo cumplido sigue consultando y dice que venció recién cuando se cancela", async () => {
    jest.replaceProperty(CONSULTAS_DE_COMPRA, "trasElPlazoMs", 20);
    await conSesion();
    let compra = conPlazoCumplido();
    servidor.use(http.get(`${API}/compras/c-04`, () => HttpResponse.json(compra)));
    await renderPantalla(RUTAS, { initialUrl: "/compra/c-04" });
    await screen.findByText(PLAZO_CUMPLIDO);

    compra = yaVencida();

    expect(await screen.findByText(RESERVA_VENCIDA)).toBeTruthy();
    expect(screen.queryByText(PLAZO_CUMPLIDO)).toBeNull();
  });

  // La hora límite se mantiene siempre un segundo adelante del reloj: el test no depende de la velocidad de la
  // máquina. Lo que cambia es lo que responde la API, que es lo que dispara la nueva consulta.
  const enPlazo = () => ({ ...RESERVA, reservaVenceEn: new Date(Date.now() + 1000).toISOString() });
  const SIN_PAGAR_A_TIEMPO = /Tu reserva venció porque no se pagó a tiempo/;
  // La API ya no ofrece pagar, por un motivo que no es el plazo.
  const noPagable = (cambios = {}) => ({
    ...RESERVA,
    reservaVenceEn: null,
    acciones: { ...RESERVA.acciones, pagar: false },
    ...cambios,
  });

  it("al llegar la hora vuelve a pedir la compra y deja de ofrecer Pagar", async () => {
    let compra = enPlazo;
    await conSesion();
    servidor.use(http.get(`${API}/compras/c-04`, () => HttpResponse.json(compra())));

    await renderPantalla(RUTAS, { initialUrl: "/compra/c-04" });

    expect(await screen.findByRole("button", { name: /^Pagar/ })).toBeTruthy();
    compra = conPlazoCumplido;
    expect(await screen.findByText(PLAZO_CUMPLIDO, {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
    expect(screen.queryByText(SIN_PAGAR_A_TIEMPO)).toBeNull();
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
      compra = () => conPlazoCumplido({ reservaVenceEn: null, operacionPago: operacion("RECHAZADA") });

      await tocarPagar();

      expect(await screen.findByText("La tarjeta fue rechazada.")).toBeTruthy();
      expect(screen.queryByText("Reserva vencida")).toBeNull();
      expect(screen.queryByText("Se terminó el plazo")).toBeNull();
      expect(screen.queryByText(SIN_PAGAR_A_TIEMPO)).toBeNull();
    });

    it("un error EVENTO_FINALIZADO no se reemplaza por el texto de reserva vencida", async () => {
      apiDePagos({ post: () => error409("EVENTO_FINALIZADO", "El evento ya se realizó") });
      await abrirHoja();
      compra = () => noPagable({ acciones: { ...RESERVA.acciones, pagar: false, cancelar: false } });

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

    describe.each([
      ["de reserva vencida", "Reserva vencida", yaVencida],
      ["de plazo cumplido", "Se terminó el plazo", conPlazoCumplido],
    ])("al cerrar el aviso %s", (_, titulo, respuesta) => {
      async function abrirYEsperarElAviso() {
        const { claves } = apiDePagos();
        await abrirHoja();
        compra = respuesta;
        await screen.findByText(titulo, {}, { timeout: 5000 });
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

      compra = yaVencida;
      // La pantalla de atrás ya mostró el aviso: la compra se refrescó.
      await screen.findByText(SIN_PAGAR_A_TIEMPO, {}, { timeout: 5000 });

      expect(screen.getByText("Agregar otra tarjeta")).toBeTruthy();
      expect(screen.queryByText("Reserva vencida")).toBeNull();
      // Al volver al resumen, ahí sí se le explica.
      await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
      expect(await screen.findByText("Reserva vencida")).toBeTruthy();
    });

    describe("si se perdió la respuesta y la compra sigue PENDIENTE con el plazo cumplido", () => {
      const sinRespuesta = () => HttpResponse.error();

      it("con el plazo cumplido y sin respuesta del pago, no dice que venció", async () => {
        apiDePagos({ post: sinRespuesta });
        await abrirHoja();
        // Se corta la red: se pierde el POST y tampoco se puede consultar la compra.
        let hayRed = false;
        servidor.use(
          http.get(`${API}/compras/c-04`, () =>
            hayRed ? HttpResponse.json(conPlazoCumplido()) : HttpResponse.error(),
          ),
        );

        await tocarPagar();

        expect(await screen.findByText("No pudimos confirmar tu pago")).toBeTruthy();
        await waitFor(() => expect(screen.queryByText("Procesando el pago")).toBeNull());
        hayRed = true;
        expect(await screen.findByText(PLAZO_CUMPLIDO, {}, { timeout: 5000 })).toBeTruthy();
        expect(screen.queryByText(/venció|se liberaron/)).toBeNull();
        expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
        expect(screen.getByLabelText("Estado: Pendiente de pago")).toBeTruthy();
      });

      it("después de un noCobrado con plazo cumplido, al cerrar la hoja no dice que venció", async () => {
        apiDePagos({ post: sinRespuesta });
        await abrirHoja();
        compra = conPlazoCumplido;

        await tocarPagar();
        await screen.findByText(/No llegamos a cobrarte/);
        await fireEvent.press(screen.getAllByRole("button", { name: "Cerrar el pago" }).at(-1));

        await waitFor(() => expect(screen.queryByText(/No llegamos a cobrarte/)).toBeNull());
        expect(await screen.findByText(PLAZO_CUMPLIDO)).toBeTruthy();
        expect(screen.queryByText(/venció|se liberaron/)).toBeNull();
        expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
      });

      it("si tocó Pagar y la compra terminó vencida, dice que no llegamos a cobrarle", async () => {
        apiDePagos({ post: sinRespuesta });
        await abrirHoja();
        compra = yaVencida;

        await tocarPagar();

        expect(
          await screen.findByText("No llegamos a cobrarte y la reserva venció. Las entradas se liberaron."),
        ).toBeTruthy();
        expect(screen.getByText("Reserva vencida")).toBeTruthy();
        // El aviso sale enseguida; la pantalla de atrás deja de ofrecer Pagar cuando se refresca la compra.
        await waitFor(() => expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull());
      });

      it("en el reintento no muestra una hora ya pasada", async () => {
        apiDePagos({ post: sinRespuesta });
        await abrirHoja();
        expect(screen.getByText(/Reservada hasta las/)).toBeTruthy();
        compra = conPlazoCumplido;

        await tocarPagar();
        await screen.findByText(/No llegamos a cobrarte/);

        await waitFor(() => expect(screen.queryByText(/Reservada hasta las/)).toBeNull());
        expect(screen.getAllByRole("button", { name: /^Pagar/ })).toHaveLength(1);
      });

      it("no dice que venció y permite reintentar con la misma clave", async () => {
        const { claves } = apiDePagos({
          post: (n) =>
            n === 1 ? HttpResponse.error() : HttpResponse.json(operacion("PENDIENTE"), { status: 202 }),
          resultados: ["APROBADA"],
        });
        await abrirHoja();
        compra = conPlazoCumplido;

        await tocarPagar();

        expect(await screen.findByText(/No llegamos a cobrarte/)).toBeTruthy();
        expect(screen.queryByText("Reserva vencida")).toBeNull();
        expect(screen.queryByText("Se terminó el plazo")).toBeNull();
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
        compra = conPlazoCumplido;

        await tocarPagar();
        await screen.findByText(/No llegamos a cobrarte/);
        await tocarPagar();

        expect(await screen.findByText("Reserva vencida")).toBeTruthy();
        expect(screen.getByText("Tu reserva venció. Volvé a reservar si todavía querés ir.")).toBeTruthy();
        await waitFor(() => expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull());
      });
    });

    it("con el pago en vuelo y el plazo cumplido, sigue mostrando el anillo", async () => {
      const { promise: postEnVuelo, resolve: liberarPost } = Promise.withResolvers();
      apiDePagos({
        post: async () => {
          await postEnVuelo;
          return HttpResponse.json(operacion("PENDIENTE"), { status: 202 });
        },
      });
      await abrirHoja();
      await tocarPagar();
      await screen.findByText("Procesando el pago");

      compra = conPlazoCumplido;
      // La compra ya se refrescó: la pantalla de atrás muestra el aviso.
      await screen.findByText(PLAZO_CUMPLIDO, {}, { timeout: 5000 });

      expect(screen.getByText("Procesando el pago")).toBeTruthy();
      expect(screen.queryByText(/^Se terminó el plazo$/)).toBeNull();
      expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
      liberarPost();
      expect(await screen.findByText("Pago confirmado")).toBeTruthy();
    });

    describe("el aviso de la pantalla se anuncia al lector", () => {
      let anuncio;
      const anunciosDe = (texto) => anuncio.mock.calls.filter(([mensaje]) => mensaje === texto);

      beforeEach(() => {
        jest.replaceProperty(Platform, "OS", "ios");
        anuncio = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
        anuncio.mockClear();
      });

      it.each([
        ["el plazo cumplido", conPlazoCumplido, PLAZO_CUMPLIDO],
        ["la reserva vencida", yaVencida, RESERVA_VENCIDA],
      ])("en iOS anuncia %s", async (_, respuesta, texto) => {
        await abrirCompra(respuesta());

        await screen.findByText(texto);

        expect(anunciosDe(texto)).toHaveLength(1);
      });

      it("en Android no se anuncia a mano, para que no se lea dos veces", async () => {
        jest.replaceProperty(Platform, "OS", "android");

        await abrirCompra(yaVencida());

        await screen.findByText(RESERVA_VENCIDA);
        expect(anunciosDe(RESERVA_VENCIDA)).toHaveLength(0);
      });

      it("con la hoja abierta se anuncia una sola vez", async () => {
        apiDePagos();
        await abrirHoja();

        compra = conPlazoCumplido;

        await screen.findByText("Se terminó el plazo", {}, { timeout: 5000 });
        expect(anunciosDe(PLAZO_CUMPLIDO)).toHaveLength(1);
      });

      it("con el pago en vuelo no anuncia que se terminó el plazo", async () => {
        const { promise: postEnVuelo, resolve: liberarPost } = Promise.withResolvers();
        apiDePagos({
          post: async () => {
            await postEnVuelo;
            return HttpResponse.json(operacion("PENDIENTE"), { status: 202 });
          },
        });
        await abrirHoja();
        await tocarPagar();
        await screen.findByText("Procesando el pago");

        compra = conPlazoCumplido;
        await screen.findByText(PLAZO_CUMPLIDO, {}, { timeout: 5000 });

        expect(anunciosDe(PLAZO_CUMPLIDO)).toHaveLength(0);
        liberarPost();
        await screen.findByText("Pago confirmado");
      });

      it("al cerrar la hoja después de un noCobrado, anuncia el aviso que estaba tapado", async () => {
        apiDePagos({ post: () => HttpResponse.error() });
        await abrirHoja();
        compra = conPlazoCumplido;
        await tocarPagar();
        await screen.findByText(/No llegamos a cobrarte/);
        expect(anunciosDe(PLAZO_CUMPLIDO)).toHaveLength(0);

        await fireEvent.press(screen.getAllByRole("button", { name: "Cerrar el pago" }).at(-1));

        await waitFor(() => expect(anunciosDe(PLAZO_CUMPLIDO)).toHaveLength(1));
      });
    });

    it("con la hoja abierta en el resumen, al cumplirse el plazo deja de ofrecer Pagar y no dice que venció", async () => {
      apiDePagos();
      await abrirHoja();

      compra = conPlazoCumplido;

      expect(await screen.findByText("Se terminó el plazo", {}, { timeout: 5000 })).toBeTruthy();
      expect(screen.queryByText("Reserva vencida")).toBeNull();
      expect(screen.queryByText(/venció|se liberaron/)).toBeNull();
      expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
      expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();
    });

    it("con la hoja abierta en el resumen, al cancelarse la reserva explica que venció", async () => {
      jest.replaceProperty(CONSULTAS_DE_COMPRA, "trasElPlazoMs", 20);
      apiDePagos();
      await abrirHoja();
      compra = conPlazoCumplido;
      await screen.findByText("Se terminó el plazo", {}, { timeout: 5000 });

      compra = yaVencida;

      expect(await screen.findByText("Reserva vencida")).toBeTruthy();
      expect(screen.queryByText("Se terminó el plazo")).toBeNull();
      expect(screen.queryByRole("button", { name: /^Pagar/ })).toBeNull();
    });
  });

  it("al organizador le habla de la reserva de otra persona", async () => {
    await abrirCompra(yaVencida(), { ...USUARIO, id: "u-martin", nombre: "Martín" });

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

describe("Compra abierta con ?pagar=1 (recién reservada)", () => {
  const COMPRA_RESERVADA = {
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

  async function abrirCompra(url, compra = COMPRA_RESERVADA) {
    await conSesion();
    apiDePagos();
    servidor.use(http.get(`${API}/compras/c-04`, () => HttpResponse.json(compra)));
    await renderPantalla(RUTAS, { initialUrl: url });
  }

  it("con ?pagar=1 abre la hoja de pago", async () => {
    await abrirCompra("/compra/c-04?pagar=1");

    expect(await screen.findByText("Confirmá el pago")).toBeTruthy();
  });

  it("sin el parámetro no la abre", async () => {
    await abrirCompra("/compra/c-04");

    expect(await screen.findByRole("button", { name: /^Pagar/ })).toBeTruthy();
    expect(screen.queryByText("Confirmá el pago")).toBeNull();
  });

  it("no la abre si la compra ya no se puede pagar", async () => {
    const yaPagada = {
      ...COMPRA_RESERVADA,
      estado: "CONFIRMADA",
      acciones: { ...COMPRA_RESERVADA.acciones, pagar: false },
    };

    await abrirCompra("/compra/c-04?pagar=1", yaPagada);

    expect(await screen.findByText("Confirmada")).toBeTruthy();
    expect(screen.queryByText("Confirmá el pago")).toBeNull();
  });

  it("no la abre si la reserva ya venció", async () => {
    const vencida = {
      ...COMPRA_RESERVADA,
      estado: "CANCELADA",
      reservaVenceEn: null,
      reservaVencida: true,
      acciones: { ...COMPRA_RESERVADA.acciones, pagar: false, cancelar: false },
    };

    await abrirCompra("/compra/c-04?pagar=1", vencida);

    expect(await screen.findByText(RESERVA_VENCIDA)).toBeTruthy();
    expect(screen.queryByText("Confirmá el pago")).toBeNull();
  });

  it("no la abre si ya se cumplió el plazo", async () => {
    const plazoCumplido = {
      ...COMPRA_RESERVADA,
      reservaVenceEn: "2026-11-01T12:15:00-03:00",
      reservaPlazoCumplido: true,
      acciones: { ...COMPRA_RESERVADA.acciones, pagar: false },
    };

    await abrirCompra("/compra/c-04?pagar=1", plazoCumplido);

    expect(await screen.findByText(PLAZO_CUMPLIDO)).toBeTruthy();
    expect(screen.queryByText("Confirmá el pago")).toBeNull();
    expect(screen.queryByText(/venció/)).toBeNull();
  });

  it("al cerrarla, la reserva sigue en pie y no se vuelve a abrir", async () => {
    await abrirCompra("/compra/c-04?pagar=1");
    await screen.findByText("Confirmá el pago");

    await fireEvent.press(screen.getAllByRole("button", { name: "Cerrar el pago" }).at(-1));

    expect(await screen.findByRole("button", { name: /^Pagar/ })).toBeTruthy();
    expect(screen.queryByText("Confirmá el pago")).toBeNull();
    expect(screen.getSearchParams().pagar).toBeUndefined();
  });
});
