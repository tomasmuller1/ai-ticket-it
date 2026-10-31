import { describe, expect, it } from "vitest";

import { unEvento, unUsuario } from "../../helpers/fabricas.js";

describe("Usuario", () => {
  it("agrega y quita eventos favoritos sin duplicarlos", () => {
    const usuario = unUsuario();
    const evento = unEvento();

    usuario.agregarFavorito(evento);
    usuario.agregarFavorito(evento);

    expect(usuario.favoritos).toEqual([evento]);
    expect(usuario.esFavorito(evento)).toBe(true);

    usuario.quitarFavorito(evento);

    expect(usuario.esFavorito(evento)).toBe(false);
  });

  it("dos usuarios son el mismo si tienen el mismo id", () => {
    expect(unUsuario({ id: "x" }).es(unUsuario({ id: "x", nombre: "Otro" }))).toBe(true);
    expect(unUsuario({ id: "x" }).es(unUsuario({ id: "y" }))).toBe(false);
  });

  it("nombreCompleto junta nombre y apellido", () => {
    expect(unUsuario({ nombre: "Ana", apellido: "García" }).nombreCompleto()).toBe("Ana García");
  });
});
