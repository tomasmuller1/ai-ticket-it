import { jest } from "@jest/globals";

import { crearRepositorios } from "../../src/repositories/index.js";
import { ComprasService } from "../../src/services/ComprasService.js";
import { unaCompra, unEvento, unReloj, unTipoEntrada, unUsuario } from "../helpers/fabricas.js";

const comprador = unUsuario();
const VENCE_EN = new Date("2026-11-01T12:15:00-03:00");

describe("ComprasService#vencerReservas", () => {
  let repositorios;
  let reloj;
  let logger;
  let service;

  beforeEach(async () => {
    repositorios = crearRepositorios();
    reloj = unReloj("2026-11-01T12:20:00-03:00");
    logger = { error: jest.fn() };
    service = new ComprasService(repositorios, null, reloj, null, logger, 15);
    const evento = unEvento({ tiposEntrada: [unTipoEntrada({ cupo: 100 })] });
    for (const id of ["c-1", "c-2"]) {
      await repositorios.compras.guardar(unaCompra({ id, evento, comprador, venceEn: VENCE_EN }));
    }
  });

  it("un error inesperado en una compra no frena el barrido", async () => {
    const guardar = repositorios.compras.guardar.bind(repositorios.compras);
    repositorios.compras.guardar = async (compra) => {
      if (compra.id === "c-1") throw new Error("falla de guardado");
      return guardar(compra);
    };

    const vencidas = await service.vencerReservas();

    expect(vencidas).toBe(1);
    expect((await repositorios.compras.buscarPorId("c-2")).estado).toBe("CANCELADA");
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ compraId: "c-1" }),
      expect.any(String),
    );
  });

  it("saltea la compra con una operación en curso hasta el próximo barrido", async () => {
    const { promise, resolve } = Promise.withResolvers();
    const buscarPorId = repositorios.compras.buscarPorId.bind(repositorios.compras);
    repositorios.compras.buscarPorId = async (id) => {
      if (id === "c-1") await promise;
      return buscarPorId(id);
    };
    const cancelacion = service.cancelar("c-1", comprador);

    const vencidas = await service.vencerReservas();
    resolve();
    await cancelacion;

    expect(vencidas).toBe(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect((await buscarPorId("c-1")).vencida).toBe(false);
    expect((await buscarPorId("c-2")).vencida).toBe(true);
  });
});
