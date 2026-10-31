import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { validar } from "../../src/middlewares/validar.js";
import { ValidacionError } from "../../src/errors/index.js";

function ejecutar(middleware, req) {
  const next = vi.fn();
  middleware(req, {}, next);
  return next;
}

describe("validar", () => {
  const schemas = {
    params: z.object({ id: z.string() }),
    query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
    body: z.object({ cantidad: z.number().int().positive() }),
  };

  it("deja los datos parseados en req.validado", () => {
    const req = { params: { id: "7" }, query: { page: "3" }, body: { cantidad: 2 } };

    const next = ejecutar(validar(schemas), req);

    expect(next).toHaveBeenCalledWith();
    expect(req.validado).toEqual({ params: { id: "7" }, query: { page: 3 }, body: { cantidad: 2 } });
  });

  it("aplica los valores por defecto", () => {
    const req = { params: { id: "7" }, query: {}, body: { cantidad: 1 } };

    ejecutar(validar(schemas), req);

    expect(req.validado.query.page).toBe(1);
  });

  it("junta los errores de todas las partes en un ValidacionError", () => {
    const req = { params: { id: "7" }, query: { page: "0" }, body: { cantidad: -1 } };

    const next = ejecutar(validar(schemas), req);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidacionError);
    expect(error.status).toBe(400);
    expect(error.detalles.map(({ ubicacion, campo }) => `${ubicacion}.${campo}`)).toEqual([
      "query.page",
      "body.cantidad",
    ]);
  });
});
