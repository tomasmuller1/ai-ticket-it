import { describe, expect, it } from "vitest";
import request from "supertest";

import { crearAppDePrueba } from "../helpers/app.js";

describe("Eventos", () => {
  const app = crearAppDePrueba();

  it("GET /api/eventos lista los eventos con sus tipos de entrada", async () => {
    const res = await request(app).get("/api/eventos");

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({
      id: expect.any(String),
      categoria: { id: expect.any(String), nombre: expect.any(String) },
      organizador: { id: expect.any(String), nombre: expect.any(String) },
    });
  });

  it("GET /api/eventos/:id devuelve el detalle con los disponibles por tipo", async () => {
    const res = await request(app).get("/api/eventos/e-rock-nacional");

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Noche de Rock Nacional");
    expect(res.body.tiposEntrada.find((t) => t.nombre === "VIP").disponibles).toBe(1);
  });

  it("GET /api/eventos/:id inexistente responde 404", async () => {
    const res = await request(app).get("/api/eventos/no-existe");

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ codigo: "NO_ENCONTRADO", mensaje: "No existe el evento no-existe" });
  });
});
