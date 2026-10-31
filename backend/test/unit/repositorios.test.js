import { describe, expect, it } from "vitest";

import { crearRepositorios } from "../../src/repositories/index.js";
import { unaCompra, unEvento, unOrganizador, unUsuario } from "../helpers/fabricas.js";

describe("Repositorios en memoria", () => {
  it("guarda, busca por id y lista", async () => {
    const { eventos } = crearRepositorios();
    const evento = unEvento();

    await eventos.guardar(evento);

    expect(await eventos.buscarPorId("e-1")).toBe(evento);
    expect(await eventos.buscarTodos()).toEqual([evento]);
    expect(await eventos.buscarPorId("otro")).toBeNull();
  });

  it("asigna un id si la entidad no tiene", async () => {
    const { usuarios } = crearRepositorios();
    const usuario = unUsuario({ id: undefined });

    await usuarios.guardar(usuario);

    expect(usuario.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("busca usuarios por email sin importar mayúsculas", async () => {
    const { usuarios } = crearRepositorios();
    await usuarios.guardar(unUsuario({ email: "Ana@Mail.com" }));

    expect((await usuarios.buscarPorEmail("ana@mail.COM")).nombre).toBe("Ana");
    expect(await usuarios.buscarPorEmail("nadie@mail.com")).toBeNull();
  });

  it("busca compras por comprador y por evento", async () => {
    const { compras } = crearRepositorios();
    const compra = unaCompra();
    await compras.guardar(compra);

    expect(await compras.buscarPorComprador(unUsuario().id)).toEqual([compra]);
    expect(await compras.buscarPorEvento("e-1")).toEqual([compra]);
    expect(await compras.buscarPorComprador(unOrganizador().id)).toEqual([]);
  });

  it("busca eventos por organizador", async () => {
    const { eventos } = crearRepositorios();
    await eventos.guardar(unEvento());

    expect(await eventos.buscarPorOrganizador(unOrganizador().id)).toHaveLength(1);
    expect(await eventos.buscarPorOrganizador("otro")).toHaveLength(0);
  });
});
