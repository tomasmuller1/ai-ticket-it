import { formato } from "../../src/utils/formato";
import {
  etiquetaDeNotificacion,
  iconoDeNotificacion,
  rutaDeNotificacion,
  textoBurbuja,
} from "../../src/utils/notificaciones";

const notificacion = (tipo, compraId) => ({
  id: "n-1",
  tipo,
  evento: { id: "e-1", nombre: "Recital" },
  compraId,
});

describe("rutaDeNotificacion", () => {
  it.each([
    ["un mensaje abre el chat de la compra", notificacion("MENSAJE_NUEVO", "c-1"), "/compra/c-1/chat"],
    [
      "un tipo de entrada agotado abre la gestión del evento",
      notificacion("ENTRADAS_AGOTADAS", null),
      "/organizador/evento/e-1",
    ],
    [
      "un evento agotado abre la gestión del evento",
      notificacion("EVENTO_AGOTADO", null),
      "/organizador/evento/e-1",
    ],
    ["un pago aprobado abre la compra", notificacion("PAGO_CONFIRMADO", "c-1"), "/compra/c-1"],
    ["un evento pospuesto con compra abre la compra", notificacion("EVENTO_POSPUESTO", "c-1"), "/compra/c-1"],
    ["sin compra abre el evento", notificacion("EVENTO_CANCELADO", null), "/evento/e-1"],
  ])("%s", (_caso, n, ruta) => {
    expect(rutaDeNotificacion(n)).toBe(ruta);
  });
});

describe("iconoDeNotificacion", () => {
  it.each([
    ["PAGO_CONFIRMADO", "checkmark-circle"],
    ["PAGO_RECHAZADO", "close-circle"],
    ["RESERVA_VENCIDA", "time"],
    ["REEMBOLSO_REALIZADO", "cash"],
    ["ENTRADA_UTILIZADA", "ticket"],
    ["MENSAJE_NUEVO", "chatbubble"],
    ["ENTRADAS_AGOTADAS", "flame"],
    ["EVENTO_AGOTADO", "flame"],
    ["EVENTO_POSPUESTO", "calendar"],
    ["EVENTO_CANCELADO", "ban"],
    ["UN_TIPO_NUEVO", "notifications"],
  ])("%s usa el ícono %s", (tipo, icono) => {
    expect(iconoDeNotificacion(tipo)).toBe(icono);
  });
});

describe("textoBurbuja", () => {
  it("muestra la cantidad tal cual hasta 9", () => {
    expect(textoBurbuja(3)).toBe("3");
    expect(textoBurbuja(9)).toBe("9");
  });

  it("con más de 9 muestra 9+", () => {
    expect(textoBurbuja(12)).toBe("9+");
  });

  it("sin no leídas no hay burbuja", () => {
    expect(textoBurbuja(0)).toBeUndefined();
    expect(textoBurbuja(undefined)).toBeUndefined();
  });
});

describe("etiquetaDeNotificacion", () => {
  it("una no leída empieza con 'Sin leer.' y suma el punto que le falta a cada parte", () => {
    const n = { titulo: "Pago aprobado", cuerpo: "Ya tenés 2 entradas General para Recital", leida: false };

    expect(etiquetaDeNotificacion(n, "Hace 5 min")).toBe(
      "Sin leer. Pago aprobado. Ya tenés 2 entradas General para Recital. Hace 5 min",
    );
  });

  it("no repite la puntuación de un título o un cuerpo que ya la traen", () => {
    const n = {
      titulo: "¡Que lo disfrutes!",
      cuerpo: "Validaron tu entrada para Recital. Después contanos qué te pareció.",
      leida: true,
    };

    expect(etiquetaDeNotificacion(n, "Ayer")).toBe(
      "¡Que lo disfrutes! Validaron tu entrada para Recital. Después contanos qué te pareció. Ayer",
    );
  });

  it("un cuerpo recortado con … no suma otro punto", () => {
    const n = { titulo: "¿Venís?", cuerpo: "Hola Sofía, abrimos a las…", leida: true };

    expect(etiquetaDeNotificacion(n, "Recién")).toBe("¿Venís? Hola Sofía, abrimos a las… Recién");
  });
});

describe("formato.haceCuanto", () => {
  // Fechas locales: "Ayer" depende del día en el calendario del celular, no de 24 horas justas.
  const AHORA = new Date(2026, 10, 7, 12, 0, 0);
  const antes = (ms) => new Date(AHORA.getTime() - ms).toISOString();
  const MINUTO = 60_000;
  const HORA = 60 * MINUTO;

  it("con menos de un minuto dice Recién", () => {
    expect(formato.haceCuanto(antes(30_000), AHORA)).toBe("Recién");
  });

  it("si el reloj del celular está atrasado, una fecha futura también es Recién", () => {
    expect(formato.haceCuanto(antes(-10_000), AHORA)).toBe("Recién");
  });

  it("con menos de una hora cuenta los minutos", () => {
    expect(formato.haceCuanto(antes(5 * MINUTO), AHORA)).toBe("Hace 5 min");
  });

  it("con menos de un día cuenta las horas", () => {
    expect(formato.haceCuanto(antes(3 * HORA), AHORA)).toBe("Hace 3 h");
    expect(formato.haceCuanto(antes(60 * MINUTO), AHORA)).toBe("Hace 1 h");
  });

  it("del día anterior dice Ayer", () => {
    expect(formato.haceCuanto(new Date(2026, 10, 6, 9, 0).toISOString(), AHORA)).toBe("Ayer");
  });

  it("de antes de ayer muestra la fecha corta", () => {
    const iso = new Date(2026, 10, 2, 12, 0).toISOString();

    expect(formato.haceCuanto(iso, AHORA)).toBe(formato.fechaCorta(iso));
  });
});
