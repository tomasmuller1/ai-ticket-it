import { RolUsuario } from "../../../src/domain/Usuario.js";
import { unEvento, unOrganizador, unUsuario } from "../../helpers/fabricas.js";

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

  it("tiene un solo rol: comprador por defecto u organizador", () => {
    expect(unUsuario().rol).toBe(RolUsuario.COMPRADOR);
    expect(unUsuario().tieneRol(RolUsuario.COMPRADOR)).toBe(true);
    expect(unOrganizador().tieneRol(RolUsuario.ORGANIZADOR)).toBe(true);
    expect(unOrganizador().tieneRol(RolUsuario.COMPRADOR)).toBe(false);
  });

  it("no acepta un rol que no existe", () => {
    expect(() => unUsuario({ rol: "ADMIN" })).toThrow("Rol de usuario inválido");
  });
});
