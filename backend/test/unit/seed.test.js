import { describe, expect, it } from "vitest";

import { crearDatosDeEjemplo } from "../../src/data/seed.js";
import { EstadoCompra } from "../../src/domain/estados/EstadoCompra.js";
import { unReloj } from "../helpers/fabricas.js";

describe("Datos de ejemplo", () => {
  const reloj = unReloj();
  const datos = crearDatosDeEjemplo(reloj);

  it("tiene compras en todos los estados", () => {
    const estados = new Set(datos.compras.map((compra) => compra.estado));

    expect([...estados].sort()).toEqual(Object.values(EstadoCompra).sort());
  });

  it("tiene eventos próximos y eventos ya realizados con reseñas", () => {
    const realizados = datos.eventos.filter((evento) => evento.yaSeRealizo(reloj));

    expect(realizados.length).toBeGreaterThan(0);
    expect(datos.eventos.length - realizados.length).toBeGreaterThan(realizados.length);
    expect(datos.resenias.every((resenia) => resenia.evento.yaSeRealizo(reloj))).toBe(true);
  });

  it("el cupo vendido coincide con las compras activas", () => {
    for (const evento of datos.eventos) {
      for (const tipo of evento.tiposEntrada) {
        const activas = datos.compras.filter(
          (c) =>
            c.tipoEntrada === tipo &&
            [EstadoCompra.PENDIENTE, EstadoCompra.CONFIRMADA, EstadoCompra.UTILIZADA].includes(c.estado),
        );
        expect(tipo.vendidas, `${evento.id}/${tipo.nombre}`).toBe(
          activas.reduce((t, c) => t + c.cantidad, 0),
        );
      }
    }
  });

  it("incluye un tipo de entrada casi agotado para probar el control de cupo", () => {
    const tipos = datos.eventos.flatMap((evento) => evento.tiposEntrada);

    expect(tipos.some((tipo) => tipo.disponibles() > 0 && tipo.disponibles() <= 2)).toBe(true);
  });

  it("cada evento tiene al menos una imagen", () => {
    expect(datos.eventos.every((evento) => evento.multimedia.length > 0)).toBe(true);
  });
});
