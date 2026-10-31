import { describe, expect, it } from "vitest";
import request from "supertest";

import { crearAppDePrueba } from "../helpers/app.js";
import { crearRepositorios } from "../../src/repositories/index.js";

describe("Manejo de errores", () => {
  it("una ruta inexistente responde 404 con el formato estándar", async () => {
    const res = await request(crearAppDePrueba()).get("/api/no-existe");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { codigo: "NO_ENCONTRADO", mensaje: "No existe la ruta GET /api/no-existe" },
    });
  });

  it("un body con JSON mal formado responde 400", async () => {
    const res = await request(crearAppDePrueba())
      .post("/api/eventos")
      .set("Content-Type", "application/json")
      .send("{ esto no es json");

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("JSON_INVALIDO");
  });

  it("un error inesperado responde 500 sin filtrar detalles internos", async () => {
    const repositorioRoto = {
      async buscarTodos() {
        throw new Error("se cayó la base");
      },
    };
    const res = await request(
      crearAppDePrueba({ repositorios: { ...crearRepositorios(), eventos: repositorioRoto } }),
    ).get("/api/eventos");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" } });
    expect(JSON.stringify(res.body)).not.toContain("se cayó la base");
  });
});
