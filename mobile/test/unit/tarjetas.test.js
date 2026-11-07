import { formatearNumero, formatearVencimiento, marcaDe, soloDigitos } from "../../src/utils/tarjetas";

describe("tarjetas", () => {
  it.each([
    ["4111 1111", "Visa"],
    ["5500 0000", "Mastercard"],
    ["2221 0000", "Mastercard"],
    ["3782 8224", "American Express"],
    ["6011 0000", null],
  ])("reconoce la marca de %s", (numero, marca) => {
    expect(marcaDe(numero)).toBe(marca);
  });

  it("agrupa el número de a 4 dígitos", () => {
    expect(formatearNumero("4111111111111111")).toBe("4111 1111 1111 1111");
  });

  it("agrupa American Express como 4-6-5", () => {
    expect(formatearNumero("378282246310005")).toBe("3782 822463 10005");
  });

  it("descarta lo que no sea un dígito", () => {
    expect(soloDigitos("41-11 a")).toBe("4111");
  });

  it("agrega la barra al vencimiento cuando hay más de 2 dígitos", () => {
    expect(formatearVencimiento("1230")).toBe("12/30");
    expect(formatearVencimiento("12")).toBe("12");
  });
});
