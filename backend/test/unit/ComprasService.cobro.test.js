import { jest } from "@jest/globals";

import { EstadoOperacionPago } from "../../src/domain/OperacionPago.js";
import { TransicionInvalidaError } from "../../src/errors/index.js";
import { crearRepositorios } from "../../src/repositories/index.js";
import { ComprasService } from "../../src/services/ComprasService.js";
import { NotificacionesService } from "../../src/services/NotificacionesService.js";
import { unaCompra, unReloj, unUsuario } from "../helpers/fabricas.js";
import { hastaQue, pasarelaEnEspera } from "../helpers/pagos.js";

const comprador = unUsuario();

describe("ComprasService: resultado del cobro", () => {
  let repositorios;
  let logger;
  let pasarela;
  let service;

  beforeEach(() => {
    repositorios = crearRepositorios();
    const reloj = unReloj();
    logger = { error: jest.fn() };
    pasarela = pasarelaEnEspera();
    const tarjetas = { obtener: async () => ({ token: "tok_prueba" }) };
    const notificaciones = new NotificacionesService(repositorios, reloj, logger);
    service = new ComprasService(repositorios, pasarela, reloj, tarjetas, logger, 15, notificaciones);
  });

  it("si la pasarela cobró pero la compra no se pudo confirmar, no lo da por rechazado ni avisa un rechazo", async () => {
    const compra = await repositorios.compras.guardar(unaCompra({ comprador }));
    await service.iniciarPago(compra.id, comprador, "t-1");
    compra.confirmarPago = () => {
      throw new TransicionInvalidaError("No se puede pagar una compra CANCELADA");
    };

    pasarela.liberar();
    await hastaQue(
      async () =>
        logger.error.mock.calls.length > 0 || (await repositorios.notificaciones.buscarTodos()).length > 0,
    );

    expect(pasarela.operaciones).toEqual([expect.objectContaining({ tipo: "COBRO", referencia: compra.id })]);
    expect(compra.operacionPago.estado).not.toBe(EstadoOperacionPago.RECHAZADA);
    expect(await repositorios.notificaciones.buscarTodos()).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ compraId: compra.id, transaccionId: pasarela.operaciones[0].id }),
      expect.any(String),
    );
  });
});
