import { jest } from "@jest/globals";

import { EstadoCompra } from "../../src/domain/estados/EstadoCompra.js";
import { crearRepositorios } from "../../src/repositories/index.js";
import { ComprasService } from "../../src/services/ComprasService.js";
import { NotificacionesService } from "../../src/services/NotificacionesService.js";
import { unaCompra, unEvento, unOrganizador, unReloj, unUsuario } from "../helpers/fabricas.js";

const comprador = unUsuario();
const organizador = unOrganizador();

describe("ComprasService#reabrirEntradasPorPostergacion", () => {
  let repositorios;
  let logger;
  let service;
  let evento;
  let compra;

  beforeEach(async () => {
    repositorios = crearRepositorios();
    const reloj = unReloj();
    logger = { error: jest.fn(), warn: jest.fn() };
    const notificaciones = new NotificacionesService(repositorios, reloj, logger);
    service = new ComprasService(repositorios, null, reloj, null, logger, 15, notificaciones);
    evento = unEvento({ organizador });
    compra = unaCompra({ evento, comprador });
    compra.pagar(comprador, reloj);
    compra.marcarUtilizada(organizador, reloj);
    await repositorios.compras.guardar(compra);
    evento.posponer(new Date("2026-12-17T21:00:00-03:00"), reloj);
  });

  it("devuelve a CONFIRMADA las entradas validadas", async () => {
    const resultado = await service.reabrirEntradasPorPostergacion(evento.id, organizador);

    expect(resultado).toEqual({ resueltas: 1, pendientes: 0 });
    expect(compra.estado).toBe(EstadoCompra.CONFIRMADA);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("con el candado tomado, la reapertura loguea un warn", async () => {
    const { promise, resolve } = Promise.withResolvers();
    const buscarPorId = repositorios.compras.buscarPorId.bind(repositorios.compras);
    repositorios.compras.buscarPorId = async (id) => {
      if (id === compra.id) await promise;
      return buscarPorId(id);
    };
    // Toma el candado de la compra y queda esperando: la reapertura la encuentra ocupada.
    const cancelacion = service.cancelar(compra.id, comprador);

    const resultado = await service.reabrirEntradasPorPostergacion(evento.id, organizador);
    resolve();
    await expect(cancelacion).rejects.toThrow();

    expect(resultado).toEqual({ resueltas: 0, pendientes: 1 });
    expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ compraId: compra.id, codigo: "OPERACION_EN_CURSO" }),
      expect.any(String),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });
});
