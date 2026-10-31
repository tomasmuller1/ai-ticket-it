import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { crearAppDePrueba } from "../helpers/app.js";

const COMO = "X-Usuario-Id";

describe("Eventos", () => {
  let app;
  beforeEach(() => {
    app = crearAppDePrueba();
  });

  const buscar = (query = {}) => request(app).get("/api/eventos").query(query);

  describe("GET /api/eventos (CU3, CU11)", () => {
    it("devuelve una página de eventos próximos ordenados por fecha", async () => {
      const res = await buscar();

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 9 });
      const fechas = res.body.data.map((e) => e.fecha);
      expect(fechas).toEqual([...fechas].sort());
      expect(res.body.data[0]).toMatchObject({
        categoria: { id: expect.any(String), nombre: expect.any(String) },
        organizador: { id: expect.any(String), puntaje: expect.toBeOneOf([expect.any(Number), null]) },
        imagen: expect.stringContaining("https://"),
      });
    });

    it("puede incluir los eventos que ya se realizaron", async () => {
      const res = await buscar({ incluirPasados: "true" });

      expect(res.body.total).toBe(12);
    });

    it("busca por texto sin importar mayúsculas ni acentos", async () => {
      const res = await buscar({ q: "MUSICA" });

      expect(res.body.data.map((e) => e.id)).toEqual(
        expect.arrayContaining(["e-rock-nacional", "e-jazz-club", "e-musical"]),
      );
      expect(res.body.data.map((e) => e.id)).toContain("e-hamlet"); // "música en vivo" en la descripción
    });

    it("filtra por categoría", async () => {
      const res = await buscar({ categoria: "deportes" });

      expect(res.body.data.map((e) => e.id).sort()).toEqual(["e-maraton", "e-superclasico"]);
    });

    it("filtra por rango de precio", async () => {
      const res = await buscar({ precioMin: 0, precioMax: 0 });

      expect(res.body.data.map((e) => e.id)).toEqual(["e-ia-conf"]);
    });

    it("ordena por precio de mayor a menor", async () => {
      const res = await buscar({ orden: "precio", dir: "desc" });

      const precios = res.body.data.map((e) => e.precioDesde);
      expect(precios).toEqual([...precios].sort((a, b) => b - a));
    });

    it("ordena por puntaje del organizador con los que no tienen reseñas al final", async () => {
      const res = await buscar({ orden: "puntaje", dir: "desc" });

      const puntajes = res.body.data.map((e) => e.organizador.puntaje);
      const conPuntaje = puntajes.filter((p) => p !== null);
      expect(conPuntaje).toEqual([...conPuntaje].sort((a, b) => b - a));
      expect(puntajes.slice(conPuntaje.length).every((p) => p === null)).toBe(true);
      expect(puntajes.at(-1)).toBeNull();
    });

    it("pagina los resultados", async () => {
      const res = await buscar({ page: 2, pageSize: 4 });

      expect(res.body).toMatchObject({ page: 2, pageSize: 4, total: 9 });
      expect(res.body.data).toHaveLength(4);
    });

    it("rechaza parámetros inválidos", async () => {
      const res = await buscar({ orden: "nombre", pageSize: 500, precioMin: 10, precioMax: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error.detalles.map((d) => d.campo).sort()).toEqual(["orden", "pageSize"]);
    });
  });

  describe("GET /api/eventos/:id (CU10)", () => {
    it("devuelve el detalle con disponibles, reputación del organizador y reseñas recientes", async () => {
      const res = await request(app).get("/api/eventos/e-indie");

      expect(res.status).toBe(200);
      expect(res.body.organizador).toEqual({
        id: "u-martin",
        nombre: "Martín Gómez",
        puntaje: 4,
        cantidadResenias: 3,
      });
      expect(res.body.reseniasRecientes).toHaveLength(3);
      expect(res.body.tiposEntrada[0]).toMatchObject({ nombre: "General", cupo: 300, disponibles: 297 });
    });

    it("indica cuántas entradas quedan de cada tipo", async () => {
      const res = await request(app).get("/api/eventos/e-rock-nacional");

      expect(res.body.tiposEntrada.find((t) => t.nombre === "VIP").disponibles).toBe(1);
    });

    it("responde 404 si no existe", async () => {
      const res = await request(app).get("/api/eventos/no-existe");

      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({ codigo: "NO_ENCONTRADO", mensaje: "No existe el evento no-existe" });
    });
  });

  describe("POST /api/eventos (CU4)", () => {
    const nuevoEvento = {
      nombre: "Recital acústico",
      descripcion: "Una noche tranquila con guitarras.",
      categoriaId: "musica",
      fecha: "2027-03-15T21:00:00-03:00",
      lugar: "La Trastienda, CABA",
      multimedia: ["https://picsum.photos/seed/acustico/1200/800"],
      tiposEntrada: [
        { nombre: "General", precio: 20000, cupo: 200 },
        { nombre: "Mesa", descripcion: "Con consumición", precio: 35000, cupo: 30 },
      ],
    };

    it("crea el evento con el usuario autenticado como organizador", async () => {
      const res = await request(app).post("/api/eventos").set(COMO, "u-tomas").send(nuevoEvento);

      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/eventos/${res.body.id}`);
      expect(res.body).toMatchObject({
        nombre: "Recital acústico",
        organizador: { id: "u-tomas" },
        precioDesde: 20000,
        tiposEntrada: [
          { nombre: "General", cupo: 200, disponibles: 200 },
          { nombre: "Mesa", descripcion: "Con consumición" },
        ],
      });

      const busqueda = await buscar({ q: "acústico" });
      expect(busqueda.body.data.map((e) => e.id)).toEqual([res.body.id]);
    });

    it("exige estar autenticado", async () => {
      const res = await request(app).post("/api/eventos").send(nuevoEvento);

      expect(res.status).toBe(401);
    });

    it("rechaza una fecha pasada", async () => {
      const res = await request(app)
        .post("/api/eventos")
        .set(COMO, "u-tomas")
        .send({ ...nuevoEvento, fecha: "2020-01-01T21:00:00-03:00" });

      expect(res.status).toBe(400);
      expect(res.body.error.mensaje).toBe("La fecha del evento tiene que ser futura");
    });

    it("rechaza una categoría inexistente y tipos de entrada repetidos", async () => {
      const sinCategoria = await request(app)
        .post("/api/eventos")
        .set(COMO, "u-tomas")
        .send({ ...nuevoEvento, categoriaId: "opera" });
      const repetidos = await request(app)
        .post("/api/eventos")
        .set(COMO, "u-tomas")
        .send({ ...nuevoEvento, tiposEntrada: [nuevoEvento.tiposEntrada[0], nuevoEvento.tiposEntrada[0]] });

      expect(sinCategoria.status).toBe(400);
      expect(repetidos.status).toBe(400);
      expect(repetidos.body.error.mensaje).toBe("Hay tipos de entrada con el mismo nombre");
    });

    it("solo acepta imágenes con URLs http o https", async () => {
      const res = await request(app)
        .post("/api/eventos")
        .set(COMO, "u-tomas")
        .send({ ...nuevoEvento, multimedia: ["javascript:alert(1)"] });

      expect(res.status).toBe(400);
    });

    it("valida la forma de los datos", async () => {
      const res = await request(app)
        .post("/api/eventos")
        .set(COMO, "u-tomas")
        .send({ ...nuevoEvento, tiposEntrada: [{ nombre: "General", precio: -5, cupo: 0 }] });

      expect(res.status).toBe(400);
      expect(res.body.error.detalles.map((d) => d.campo)).toEqual([
        "tiposEntrada.0.precio",
        "tiposEntrada.0.cupo",
      ]);
    });
  });

  describe("GET /api/eventos/mios", () => {
    it("lista los eventos del organizador con el avance de las ventas", async () => {
      const res = await request(app).get("/api/eventos/mios").set(COMO, "u-tomas");

      expect(res.status).toBe(200);
      expect(res.body.map((e) => e.id)).toEqual(["e-stand-up", "e-ia-conf"]);
      expect(res.body[1]).toMatchObject({ cupoTotal: 340, vendidas: 1, disponibles: 339 });
    });

    it("exige estar autenticado", async () => {
      expect((await request(app).get("/api/eventos/mios")).status).toBe(401);
    });
  });

  describe("Categorías y reseñas de organizadores", () => {
    it("GET /api/categorias lista las categorías ordenadas por nombre", async () => {
      const res = await request(app).get("/api/categorias");

      expect(res.body.map((c) => c.nombre)).toEqual([
        "Conferencias",
        "Deportes",
        "Festivales",
        "Música",
        "Stand Up",
        "Teatro",
      ]);
    });

    it("GET /api/organizadores/:id/resenias devuelve sus reseñas paginadas, la más nueva primero", async () => {
      const res = await request(app).get("/api/organizadores/u-martin/resenias").query({ pageSize: 2 });

      expect(res.body).toMatchObject({ page: 1, pageSize: 2, total: 3 });
      expect(res.body.data[0].evento.nombre).toBe("Ciclo Indie en Vivo");
    });
  });
});
