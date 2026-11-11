import { formato } from "../../src/utils/formato";

// Intl separa el signo del importe con un espacio duro: se normaliza para comparar.
const normalizar = (texto) => texto.replace(/\s/g, " ");

describe("formato", () => {
  it("muestra una entrada sin costo como Gratis", () => {
    expect(formato.precio(0)).toBe("Gratis");
  });

  it("muestra el precio en pesos, sin decimales y con punto de miles", () => {
    expect(normalizar(formato.precio(15000))).toBe("$ 15.000");
  });

  it("en un total, 0 se muestra como monto y no como Gratis", () => {
    expect(normalizar(formato.monto(0))).toBe("$ 0");
  });

  it("muestra el puntaje con coma decimal", () => {
    expect(formato.puntaje(4)).toBe("4,0");
  });

  describe("tiempoRestante (CU1)", () => {
    it("con un día o más, lo dice en días", () => {
      expect(formato.tiempoRestante(5, 5 * 24 * 60)).toBe("faltan 5 días");
      expect(formato.tiempoRestante(1, 30 * 60)).toBe("falta 1 día");
    });

    it("con menos de un día, lo dice en horas o en minutos, no 'falta 1 día'", () => {
      expect(formato.tiempoRestante(0, 22 * 60)).toBe("faltan 22 horas");
      expect(formato.tiempoRestante(0, 60)).toBe("falta 1 hora");
      expect(formato.tiempoRestante(0, 119)).toBe("falta 1 hora");
      expect(formato.tiempoRestante(0, 45)).toBe("faltan 45 minutos");
      expect(formato.tiempoRestante(0, 1)).toBe("falta 1 minuto");
    });

    it("con el evento ya empezado dice 'ya empezó'; sin datos, null", () => {
      expect(formato.tiempoRestante(0, 0)).toBe("ya empezó");
      expect(formato.tiempoRestante(null, null)).toBeNull();
      expect(formato.tiempoRestante(undefined, undefined)).toBeNull();
    });
  });

  it("muestra el día con mayúscula y sin puntuación", () => {
    expect(formato.dia("2026-11-05T22:00:00-03:00")).toMatch(/^[A-Z][a-zé]+ \d{1,2} [a-z]+$/);
  });
});
