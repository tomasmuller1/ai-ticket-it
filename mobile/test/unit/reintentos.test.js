import { demoraReintento, debeReintentar, MAX_REINTENTOS } from "../../src/api/reintentos";

const error = (status, extra = {}) => ({ status, ...extra });

describe("debeReintentar", () => {
  it.each([
    ["sin conexión o timeout", 0],
    ["error interno", 500],
    ["servicio caído", 503],
    ["demasiadas requests", 429],
  ])("reintenta con %s", (_nombre, status) => {
    expect(debeReintentar(0, error(status))).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 422])(
    "no reintenta un %i: repetir la request no lo arregla",
    (status) => {
      expect(debeReintentar(0, error(status))).toBe(false);
    },
  );

  it("no reintenta un error que no vino de la API", () => {
    expect(debeReintentar(0, new TypeError("bug"))).toBe(false);
  });

  it("deja de reintentar al llegar al máximo", () => {
    expect(debeReintentar(MAX_REINTENTOS - 1, error(500))).toBe(true);
    expect(debeReintentar(MAX_REINTENTOS, error(500))).toBe(false);
  });

  it("reintenta un 429 si Retry-After pide una espera corta", () => {
    expect(debeReintentar(0, error(429, { retryAfterMs: 2000 }))).toBe(true);
  });

  it("no reintenta un 429 si Retry-After pide una espera larga: muestra el mensaje", () => {
    expect(debeReintentar(0, error(429, { retryAfterMs: 15 * 60 * 1000 }))).toBe(false);
  });
});

describe("demoraReintento", () => {
  it("duplica la espera en cada intento (backoff exponencial)", () => {
    const sinAzar = () => 0;

    expect(demoraReintento(0, error(500), sinAzar)).toBe(1000);
    expect(demoraReintento(1, error(500), sinAzar)).toBe(2000);
    expect(demoraReintento(2, error(500), sinAzar)).toBe(4000);
  });

  it("suma hasta 300 ms al azar para que los clientes no reintenten todos juntos", () => {
    expect(demoraReintento(0, error(500), () => 0.5)).toBe(1150);
  });

  it("respeta Retry-After en lugar del backoff", () => {
    expect(demoraReintento(0, error(429, { retryAfterMs: 3000 }), () => 0.5)).toBe(3000);
  });
});
