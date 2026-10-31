import { describe, expect, it } from "vitest";
import request from "supertest";

import { crearAppDePrueba } from "../helpers/app.js";

describe("Eventos", () => {
  const app = crearAppDePrueba();

  it("GET /api/eventos lista los eventos con sus tipos de entrada", async () => {
    const res = await request(app).get("/api/eventos");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].precioDesde).toBe(35000);
    expect(res.body[0].tiposEntrada[0].disponibles).toBe(500);
  });

  it("GET /api/eventos/:id devuelve el detalle", async () => {
    const res = await request(app).get("/api/eventos/2");

    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe("Stand Up: Noche de Humor");
  });

  it("GET /api/eventos/:id inexistente responde 404", async () => {
    const res = await request(app).get("/api/eventos/no-existe");

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ codigo: "NO_ENCONTRADO", mensaje: "No existe el evento no-existe" });
  });
});
