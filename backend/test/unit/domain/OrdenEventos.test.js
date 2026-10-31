import { describe, expect, it } from "vitest";

import { ordenarEventos } from "../../../src/domain/OrdenEventos.js";
import { unEvento, unOrganizador, unTipoEntrada } from "../../helpers/fabricas.js";

const ana = unOrganizador({ id: "org-ana" });
const beto = unOrganizador({ id: "org-beto" });
const caro = unOrganizador({ id: "org-caro" });

const barato = unEvento({
  id: "barato",
  fecha: new Date("2026-12-20"),
  organizador: ana,
  tiposEntrada: [unTipoEntrada({ precio: 100 })],
});
const caro1 = unEvento({
  id: "caro",
  fecha: new Date("2026-12-05"),
  organizador: beto,
  tiposEntrada: [unTipoEntrada({ precio: 900 })],
});
const medio = unEvento({
  id: "medio",
  fecha: new Date("2026-12-10"),
  organizador: caro,
  tiposEntrada: [unTipoEntrada({ precio: 500 })],
});
const eventos = [barato, caro1, medio];
const ids = (lista) => lista.map((e) => e.id);

describe("ordenarEventos (patrón Strategy)", () => {
  it("ordena por fecha por defecto", () => {
    expect(ids(ordenarEventos(eventos, {}))).toEqual(["caro", "medio", "barato"]);
  });

  it("ordena por precio en ambos sentidos", () => {
    expect(ids(ordenarEventos(eventos, { orden: "precio" }))).toEqual(["barato", "medio", "caro"]);
    expect(ids(ordenarEventos(eventos, { orden: "precio", dir: "desc" }))).toEqual([
      "caro",
      "medio",
      "barato",
    ]);
  });

  it("ordena por puntaje dejando a los organizadores sin reseñas al final", () => {
    const reputaciones = new Map([
      ["org-ana", { puntaje: 3.5 }],
      ["org-beto", { puntaje: 4.8 }],
    ]);

    expect(ids(ordenarEventos(eventos, { orden: "puntaje", dir: "desc" }, { reputaciones }))).toEqual([
      "caro",
      "barato",
      "medio",
    ]);
    expect(ids(ordenarEventos(eventos, { orden: "puntaje", dir: "asc" }, { reputaciones }))).toEqual([
      "barato",
      "caro",
      "medio",
    ]);
  });

  it("no modifica la lista original", () => {
    const copia = [...eventos];
    ordenarEventos(eventos, { orden: "precio" });
    expect(eventos).toEqual(copia);
  });
});
