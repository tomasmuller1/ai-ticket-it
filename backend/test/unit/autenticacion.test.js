import { describe, expect, it, vi } from "vitest";

import { requiereAutenticacion } from "../../src/middlewares/autenticacion.js";
import { AutenticadorDesarrollo } from "../../src/infra/AutenticadorDesarrollo.js";
import { NoAutenticadoError } from "../../src/errors/index.js";

const usuarios = new Map([["u-1", { id: "u-1", nombre: "Ana" }]]);
const autenticador = new AutenticadorDesarrollo((id) => usuarios.get(id));

async function ejecutar(headers) {
  const req = { headers };
  const next = vi.fn();
  await requiereAutenticacion(autenticador)(req, {}, next);
  return { req, next };
}

describe("requiereAutenticacion con AutenticadorDesarrollo", () => {
  it("carga req.usuario cuando el header identifica a un usuario existente", async () => {
    const { req, next } = await ejecutar({ "x-usuario-id": "u-1" });

    expect(next).toHaveBeenCalledWith();
    expect(req.usuario).toEqual({ id: "u-1", nombre: "Ana" });
  });

  it("rechaza con 401 si no hay header", async () => {
    const { next } = await ejecutar({});

    expect(next.mock.calls[0][0]).toBeInstanceOf(NoAutenticadoError);
  });

  it("rechaza con 401 si el usuario no existe", async () => {
    const { req, next } = await ejecutar({ "x-usuario-id": "u-999" });

    expect(next.mock.calls[0][0]).toBeInstanceOf(NoAutenticadoError);
    expect(req.usuario).toBeUndefined();
  });
});
