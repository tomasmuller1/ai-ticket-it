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

  it("muestra el día con mayúscula y sin puntuación", () => {
    expect(formato.dia("2026-11-05T22:00:00-03:00")).toMatch(/^[A-Z][a-zé]+ \d{1,2} [a-z]+$/);
  });
});
