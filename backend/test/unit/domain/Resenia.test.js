import { describe, expect, it } from "vitest";

import { Resenia } from "../../../src/domain/Resenia.js";
import { ValidacionError } from "../../../src/errors/index.js";
import { unEvento, unUsuario } from "../../helpers/fabricas.js";

function unaResenia(puntuacion, detalle = "Muy bueno") {
  return new Resenia({
    id: "r",
    comprador: unUsuario(),
    evento: unEvento(),
    puntuacion,
    detalle,
    fecha: new Date(),
  });
}

describe("Resenia", () => {
  it("acepta puntuaciones enteras de 1 a 5", () => {
    expect(unaResenia(1).puntuacion).toBe(1);
    expect(unaResenia(5).puntuacion).toBe(5);
  });

  it("rechaza puntuaciones fuera de rango o con decimales", () => {
    expect(() => unaResenia(0)).toThrow(ValidacionError);
    expect(() => unaResenia(6)).toThrow(ValidacionError);
    expect(() => unaResenia(3.5)).toThrow(ValidacionError);
  });

  it("limita el detalle a 500 caracteres", () => {
    expect(() => unaResenia(4, "x".repeat(501))).toThrow(ValidacionError);
    expect(unaResenia(4, "  bien  ").detalle).toBe("bien");
  });

  it("promedio redondea a 1 decimal y es null sin reseñas", () => {
    expect(Resenia.promedio([])).toBeNull();
    expect(Resenia.promedio([unaResenia(5), unaResenia(4), unaResenia(4)])).toBe(4.3);
  });
});
