import { describe, expect, it } from "vitest";

import { SinCupoError, ValidacionError } from "../../../src/errors/index.js";
import { unTipoEntrada } from "../../helpers/fabricas.js";

describe("TipoEntrada", () => {
  it("arranca con todo el cupo disponible", () => {
    const tipo = unTipoEntrada({ cupo: 50 });

    expect(tipo.disponibles()).toBe(50);
    expect(tipo.vendidas).toBe(0);
  });

  it("hayCupoPara indica si alcanzan las entradas disponibles", () => {
    const tipo = unTipoEntrada({ cupo: 3 });

    expect(tipo.hayCupoPara(3)).toBe(true);
    expect(tipo.hayCupoPara(4)).toBe(false);
  });

  it("reservar descuenta del cupo disponible", () => {
    const tipo = unTipoEntrada({ cupo: 10 });

    tipo.reservar(4);

    expect(tipo.disponibles()).toBe(6);
  });

  it("reservar más de lo disponible lanza SinCupoError y no reserva nada", () => {
    const tipo = unTipoEntrada({ nombre: "VIP", cupo: 2 });

    expect(() => tipo.reservar(3)).toThrow(SinCupoError);
    expect(() => tipo.reservar(3)).toThrow("Quedan 2 entradas VIP");
    expect(tipo.disponibles()).toBe(2);
  });

  it("liberar devuelve las entradas al cupo", () => {
    const tipo = unTipoEntrada({ cupo: 10 });
    tipo.reservar(5);

    tipo.liberar(5);

    expect(tipo.disponibles()).toBe(10);
  });

  it("no acepta precio negativo ni cupo menor a 1", () => {
    expect(() => unTipoEntrada({ precio: -1 })).toThrow(ValidacionError);
    expect(() => unTipoEntrada({ precio: Number.NaN })).toThrow(ValidacionError);
    expect(() => unTipoEntrada({ cupo: 0 })).toThrow(ValidacionError);
    expect(() => unTipoEntrada({ cupo: 1.5 })).toThrow(ValidacionError);
  });
});
