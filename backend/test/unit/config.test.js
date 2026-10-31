import { describe, expect, it } from "vitest";

import { cargarConfig } from "../../src/infra/config.js";

describe("cargarConfig", () => {
  it("usa valores por defecto razonables para desarrollo", () => {
    const config = cargarConfig({});

    expect(config).toEqual({
      entorno: "development",
      puerto: 3000,
      nivelLog: "info",
      origenesCors: "*",
      docsHabilitados: true,
    });
  });

  it("convierte el puerto a número y separa los orígenes de CORS", () => {
    const config = cargarConfig({ PORT: "8080", CORS_ORIGINS: "http://a.com, http://b.com" });

    expect(config.puerto).toBe(8080);
    expect(config.origenesCors).toEqual(["http://a.com", "http://b.com"]);
  });

  it("silencia los logs en tests salvo que se pida otro nivel", () => {
    expect(cargarConfig({ NODE_ENV: "test" }).nivelLog).toBe("silent");
    expect(cargarConfig({ NODE_ENV: "test", LOG_LEVEL: "debug" }).nivelLog).toBe("debug");
  });

  it("descarta orígenes de CORS vacíos y exige al menos uno", () => {
    expect(cargarConfig({ CORS_ORIGINS: "http://a.com," }).origenesCors).toEqual(["http://a.com"]);
    expect(() => cargarConfig({ CORS_ORIGINS: " , " })).toThrow(/al menos un origen/);
  });

  it("falla rápido si una variable es inválida", () => {
    expect(() => cargarConfig({ PORT: "no-es-un-puerto" })).toThrow(/Configuración inválida/);
  });

  it("no permite CORS abierto en producción", () => {
    expect(() => cargarConfig({ NODE_ENV: "production" })).toThrow(/CORS_ORIGINS/);
  });
});
