import { jest } from "@jest/globals";

import { ClaveIdempotenciaReutilizadaError, ReglaNegocioError } from "../../src/errors/index.js";
import { idempotente } from "../../src/middlewares/idempotente.js";
import { ClavesIdempotenciaRepository } from "../../src/repositories/index.js";

function unaRequest({ clave = "clave-1", usuarioId = "u-1", body = { tarjetaId: "t-1" } } = {}) {
  return {
    method: "POST",
    originalUrl: "/api/compras/c-1/pago",
    body,
    usuario: { id: usuarioId },
    validado: { headers: clave ? { "idempotency-key": clave } : {} },
  };
}

function unaRespuesta() {
  const res = {
    statusCode: 200,
    headers: {},
    enviado: undefined,
    status: (codigo) => ((res.statusCode = codigo), res),
    json: (cuerpo) => ((res.enviado = cuerpo), res),
    get: (nombre) => res.headers[nombre],
    set: (nombre, valor) => ((res.headers[nombre] = valor), res),
    location: (url) => res.set("Location", url),
  };
  return res;
}

describe("idempotente", () => {
  let claves;
  let middleware;

  beforeEach(() => {
    claves = new ClavesIdempotenciaRepository();
    middleware = idempotente(claves);
  });

  it("sin clave no interviene", async () => {
    const next = jest.fn();

    await middleware(unaRequest({ clave: null }), unaRespuesta(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(await claves.buscarTodos()).toEqual([]);
  });

  it("si la primera request con esa clave no terminó, rechaza la segunda sin ejecutarla", async () => {
    await middleware(unaRequest(), unaRespuesta(), jest.fn());
    const next = jest.fn();

    await expect(middleware(unaRequest(), unaRespuesta(), next)).rejects.toThrow(
      expect.objectContaining({ codigo: "OPERACION_EN_CURSO" }),
    );

    expect(next).not.toHaveBeenCalled();
    await expect(middleware(unaRequest(), unaRespuesta(), next)).rejects.toThrow(ReglaNegocioError);
  });

  it("de dos requests simultáneas, solo una ejecuta la operación", async () => {
    const next = jest.fn();

    const resultados = await Promise.allSettled([
      middleware(unaRequest(), unaRespuesta(), next),
      middleware(unaRequest(), unaRespuesta(), next),
    ]);

    expect(next).toHaveBeenCalledTimes(1);
    expect(resultados.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
  });

  it("repite la respuesta exitosa sin ejecutar de nuevo la operación", async () => {
    const primera = unaRespuesta();
    await middleware(unaRequest(), primera, jest.fn());
    primera.status(202).location("/api/x").json({ operacionId: "op-1" });
    const segunda = unaRespuesta();
    const next = jest.fn();

    await middleware(unaRequest(), segunda, next);

    expect(next).not.toHaveBeenCalled();
    expect(segunda.statusCode).toBe(202);
    expect(segunda.enviado).toEqual({ operacionId: "op-1" });
    expect(segunda.headers).toEqual({ Location: "/api/x", "Idempotent-Replayed": "true" });
  });

  it("libera la clave si la operación terminó en error", async () => {
    const primera = unaRespuesta();
    await middleware(unaRequest(), primera, jest.fn());
    primera.status(503).json({ error: {} });
    const next = jest.fn();

    await middleware(unaRequest(), unaRespuesta(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rechaza la misma clave con otros datos", async () => {
    await middleware(unaRequest(), unaRespuesta(), jest.fn());

    await expect(
      middleware(unaRequest({ body: { tarjetaId: "t-2" } }), unaRespuesta(), jest.fn()),
    ).rejects.toThrow(ClaveIdempotenciaReutilizadaError);
  });

  it("guarda las claves por usuario", async () => {
    await middleware(unaRequest({ usuarioId: "u-1" }), unaRespuesta(), jest.fn());
    const next = jest.fn();

    await middleware(unaRequest({ usuarioId: "u-2" }), unaRespuesta(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
