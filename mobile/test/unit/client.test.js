import { http, HttpResponse } from "msw";

import { ApiError, pedir } from "../../src/api/client";
import { API, servidor } from "../helpers/servidor";

describe("pedir", () => {
  it("devuelve el JSON de la respuesta", async () => {
    servidor.use(http.get(`${API}/categorias`, () => HttpResponse.json([{ id: "musica" }])));

    await expect(pedir("/categorias", { autenticado: false })).resolves.toEqual([{ id: "musica" }]);
  });

  it("convierte el error del backend en un ApiError con su código", async () => {
    servidor.use(
      http.get(`${API}/eventos/x`, () =>
        HttpResponse.json({ error: { codigo: "NO_ENCONTRADO", mensaje: "No existe" } }, { status: 404 }),
      ),
    );

    const error = await pedir("/eventos/x", { autenticado: false }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, codigo: "NO_ENCONTRADO", message: "No existe" });
  });
});
