import { intervaloDeCompra } from "../../src/hooks/compras";

const EN_PLAZO = {
  estado: "PENDIENTE",
  acciones: { pagar: true },
  reservaVencida: false,
  operacionPago: null,
};

describe("intervaloDeCompra", () => {
  it("con la reserva en plazo, consulta cuando llega la hora límite", () => {
    const venceEn = new Date(Date.now() + 20_000).toISOString();

    const intervalo = intervaloDeCompra({ ...EN_PLAZO, reservaVenceEn: venceEn });

    expect(intervalo).toBeGreaterThan(15_000);
    expect(intervalo).toBeLessThanOrEqual(20_000);
  });

  it("no espera más de 60 segundos aunque falte mucho, por si el reloj del celular está atrasado", () => {
    const venceEn = new Date(Date.now() + 10 * 60_000).toISOString();

    expect(intervaloDeCompra({ ...EN_PLAZO, reservaVenceEn: venceEn })).toBe(60_000);
  });

  it("no consulta más seguido que cada segundo, por si el reloj del celular está adelantado", () => {
    const venceEn = new Date(Date.now() - 60_000).toISOString();

    expect(intervaloDeCompra({ ...EN_PLAZO, reservaVenceEn: venceEn })).toBe(1000);
  });

  it("pasada la hora, mientras siga PENDIENTE, sigue consultando cada 30 segundos", () => {
    const compra = {
      ...EN_PLAZO,
      acciones: { pagar: false },
      reservaVencida: true,
      reservaVenceEn: "2026-11-01T15:15:00Z",
    };

    expect(intervaloDeCompra(compra)).toBe(30_000);
  });

  it("con la compra ya cancelada o confirmada, no consulta", () => {
    expect(
      intervaloDeCompra({
        ...EN_PLAZO,
        estado: "CANCELADA",
        reservaVencida: true,
        acciones: { pagar: false },
      }),
    ).toBe(false);
    expect(intervaloDeCompra({ ...EN_PLAZO, estado: "CONFIRMADA", acciones: { pagar: false } })).toBe(false);
  });

  it("con un pago en proceso, usa el intervalo del pago", () => {
    const compra = { ...EN_PLAZO, operacionPago: { estado: "PENDIENTE" } };

    expect(intervaloDeCompra(compra)).toBe(2000);
  });
});
