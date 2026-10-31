import { describe, expect, it } from "vitest";

import { ValidacionError } from "../../../src/errors/index.js";
import { unEvento, unOrganizador, unReloj, unTipoEntrada, unUsuario } from "../../helpers/fabricas.js";

describe("Evento", () => {
  const evento = unEvento({
    tiposEntrada: [
      unTipoEntrada({ id: "t-general", nombre: "General", precio: 5000 }),
      unTipoEntrada({ id: "t-vip", nombre: "VIP", precio: 20000 }),
    ],
  });

  it("precioDesde es el precio del tipo de entrada más barato", () => {
    expect(evento.precioDesde()).toBe(5000);
  });

  it("tuPrecioEstaEntre es verdadero si algún tipo de entrada cae en el rango", () => {
    expect(evento.tuPrecioEstaEntre(1000, 6000)).toBe(true);
    expect(evento.tuPrecioEstaEntre(15000, 30000)).toBe(true);
    expect(evento.tuPrecioEstaEntre(6000, 15000)).toBe(false);
  });

  it("tuPrecioEstaEntre acepta rangos abiertos", () => {
    expect(evento.tuPrecioEstaEntre(undefined, 5000)).toBe(true);
    expect(evento.tuPrecioEstaEntre(25000, undefined)).toBe(false);
  });

  it("encuentra un tipo de entrada por id", () => {
    expect(evento.tipoEntrada("t-vip").nombre).toBe("VIP");
    expect(evento.tipoEntrada("no-existe")).toBeUndefined();
  });

  it("yaSeRealizo compara la fecha del evento con el reloj", () => {
    const fecha = new Date("2026-12-10T21:00:00-03:00");
    const e = unEvento({ fecha });

    expect(e.yaSeRealizo(unReloj("2026-12-10T20:59:59-03:00"))).toBe(false);
    expect(e.yaSeRealizo(unReloj("2026-12-10T21:00:00-03:00"))).toBe(true);
  });

  it("sabe quién es su organizador", () => {
    expect(evento.esOrganizadoPor(unOrganizador())).toBe(true);
    expect(evento.esOrganizadoPor(unUsuario())).toBe(false);
  });

  it("exige al menos un tipo de entrada y sin nombres repetidos", () => {
    expect(() => unEvento({ tiposEntrada: [] })).toThrow(ValidacionError);
    expect(() =>
      unEvento({
        tiposEntrada: [
          unTipoEntrada({ id: "a", nombre: "VIP" }),
          unTipoEntrada({ id: "b", nombre: " vip " }),
        ],
      }),
    ).toThrow("Hay tipos de entrada con el mismo nombre");
  });
});
