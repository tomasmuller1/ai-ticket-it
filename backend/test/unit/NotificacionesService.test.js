import { jest } from "@jest/globals";

import { TipoNotificacion } from "../../src/domain/Notificacion.js";
import { NoEncontradoError } from "../../src/errors/index.js";
import { crearRepositorios } from "../../src/repositories/index.js";
import { NotificacionesService } from "../../src/services/NotificacionesService.js";
import {
  unaCompra,
  unEvento,
  unOrganizador,
  unReloj,
  unTipoEntrada,
  unUsuario,
} from "../helpers/fabricas.js";

const UN_MINUTO_MS = 60 * 1000;

describe("NotificacionesService", () => {
  let repositorios;
  let reloj;
  let logger;
  let service;
  const organizador = unOrganizador();
  const comprador = unUsuario({ nombre: "Sofía" });

  beforeEach(() => {
    repositorios = crearRepositorios();
    reloj = unReloj();
    logger = { error: jest.fn() };
    service = new NotificacionesService(repositorios, reloj, logger);
  });

  const avanzar = (ms = UN_MINUTO_MS) => {
    reloj.fecha = new Date(reloj.fecha.getTime() + ms);
  };
  const deUsuario = async (usuario) => (await service.listar(usuario, { page: 1, pageSize: 50 })).data;

  describe("avisos al comprador", () => {
    const evento = unEvento({ nombre: "Recital", organizador });

    it.each([
      [
        "avisarPagoConfirmado",
        2,
        TipoNotificacion.PAGO_CONFIRMADO,
        "Pago aprobado",
        "Ya tenés 2 entradas General para Recital.",
      ],
      [
        "avisarPagoConfirmado",
        1,
        TipoNotificacion.PAGO_CONFIRMADO,
        "Pago aprobado",
        "Ya tenés 1 entrada General para Recital.",
      ],
      [
        "avisarPagoRechazado",
        2,
        TipoNotificacion.PAGO_RECHAZADO,
        "No pudimos cobrar tu compra",
        "Se rechazó el pago de tus entradas para Recital. Podés reintentarlo desde la compra.",
      ],
      [
        "avisarReservaVencida",
        2,
        TipoNotificacion.RESERVA_VENCIDA,
        "Venció tu reserva",
        "Pasó el plazo para pagar tus entradas de Recital y las liberamos.",
      ],
      [
        "avisarReembolso",
        2,
        TipoNotificacion.REEMBOLSO_REALIZADO,
        "Te devolvimos el dinero",
        "Reintegramos $ 12.000 de tu compra para Recital.",
      ],
      [
        "avisarEntradaUtilizada",
        2,
        TipoNotificacion.ENTRADA_UTILIZADA,
        "¡Que lo disfrutes!",
        "Validaron tu entrada para Recital. Después contanos qué te pareció.",
      ],
    ])("%s con %i entradas le avisa al comprador", async (aviso, cantidad, tipo, titulo, cuerpo) => {
      const conCupo = unEvento({
        nombre: "Recital",
        organizador,
        tiposEntrada: [unTipoEntrada({ precio: 6000, cupo: 20 })],
      });
      const compra = unaCompra({ evento: conCupo, comprador, cantidad });

      await service[aviso](compra);

      expect(await deUsuario(comprador)).toEqual([
        expect.objectContaining({ tipo, titulo, cuerpo, compra, evento: conCupo, leida: false }),
      ]);
      expect(await deUsuario(organizador)).toEqual([]);
    });

    it("un aviso que falla no lanza y se loguea", async () => {
      const compra = unaCompra({ evento, comprador });
      repositorios.notificaciones.guardar = async () => {
        throw new Error("falla de guardado");
      };

      await expect(service.avisarPagoConfirmado(compra)).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ compraId: compra.id }),
        expect.any(String),
      );
    });
  });

  describe("avisos de la gestión del evento", () => {
    it("avisarEventoPospuesto le avisa al comprador la nueva fecha y la anterior", async () => {
      const evento = unEvento({ nombre: "Recital", organizador });
      const compra = unaCompra({ evento, comprador });
      const fechaAnterior = evento.posponer(new Date("2026-12-17T21:00:00-03:00"), reloj);

      await service.avisarEventoPospuesto(compra, { fechaAnterior, motivo: "Pronóstico de tormenta." });

      expect(await deUsuario(comprador)).toEqual([
        expect.objectContaining({
          tipo: TipoNotificacion.EVENTO_POSPUESTO,
          titulo: "Recital se pospuso",
          cuerpo:
            "La nueva fecha es Jue 17 dic, 21:00 (era Jue 10 dic, 21:00). Si todavía querés ir, completá el pago antes de que venza tu reserva. Motivo: Pronóstico de tormenta.",
          compra,
          evento,
          leida: false,
        }),
      ]);
      expect(await deUsuario(organizador)).toEqual([]);
    });

    it("avisarEventoCancelado le avisa al comprador cuánto le devolvemos", async () => {
      const evento = unEvento({ nombre: "Recital", organizador });
      const compra = unaCompra({ evento, comprador });
      compra.pagar(comprador, reloj);
      evento.cancelar(reloj);

      await service.avisarEventoCancelado(compra, { motivo: undefined });

      expect(await deUsuario(comprador)).toEqual([
        expect.objectContaining({
          tipo: TipoNotificacion.EVENTO_CANCELADO,
          titulo: "Se canceló Recital",
          cuerpo: "Te devolvemos $ 2.000 a tu tarjeta.",
          compra,
          evento,
        }),
      ]);
      expect(await deUsuario(organizador)).toEqual([]);
    });

    it("un aviso de la gestión del evento que falla no lanza y se loguea", async () => {
      const evento = unEvento({ nombre: "Recital", organizador });
      const compra = unaCompra({ evento, comprador });
      evento.cancelar(reloj);
      repositorios.notificaciones.guardar = async () => {
        throw new Error("falla de guardado");
      };

      await expect(service.avisarEventoCancelado(compra, {})).resolves.toBeUndefined();
      await expect(
        service.avisarEventoPospuesto(compra, { fechaAnterior: evento.fecha }),
      ).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ compraId: compra.id, tipo: TipoNotificacion.EVENTO_CANCELADO }),
        expect.any(String),
      );
    });
  });

  describe("avisarMensajeNuevo", () => {
    let evento;
    let compra;

    beforeEach(() => {
      evento = unEvento({ nombre: "Recital", organizador });
      compra = unaCompra({ evento, comprador });
    });

    const escribir = (autor, texto = "Hola") =>
      service.avisarMensajeNuevo(compra, compra.enviarMensaje(texto, autor, reloj));

    it("le avisa a la otra parte, no a quien escribe", async () => {
      await escribir(comprador, "¿A qué hora abren?");
      const alOrganizador = await deUsuario(organizador);
      const alComprador = await deUsuario(comprador);
      await escribir(organizador, "A las 19 h");

      expect(alOrganizador).toEqual([
        expect.objectContaining({
          tipo: TipoNotificacion.MENSAJE_NUEVO,
          titulo: "Sofía te escribió por Recital",
          cuerpo: "¿A qué hora abren?",
          compra,
        }),
      ]);
      expect(alComprador).toEqual([]);
      expect(await deUsuario(comprador)).toEqual([
        expect.objectContaining({ titulo: "Luis te escribió por Recital", cuerpo: "A las 19 h" }),
      ]);
    });

    it("los mensajes sin leer de una compra se juntan en una notificación", async () => {
      await escribir(comprador, "Hola");
      avanzar();
      await escribir(comprador, "¿Hay estacionamiento?");
      avanzar();
      await escribir(comprador, "¿Y guardarropas?");

      const notificaciones = await deUsuario(organizador);

      expect(notificaciones).toHaveLength(1);
      expect(notificaciones[0]).toMatchObject({
        cantidad: 3,
        titulo: "Sofía te escribió 3 mensajes por Recital",
        cuerpo: "¿Y guardarropas?",
        fechaHora: reloj.ahora(),
        leida: false,
      });
    });

    it("dos mensajes que llegan juntos también se juntan", async () => {
      await Promise.all([escribir(comprador, "Hola"), escribir(comprador, "¿Hay estacionamiento?")]);

      const notificaciones = await deUsuario(organizador);

      expect(notificaciones).toHaveLength(1);
      expect(notificaciones[0].cantidad).toBe(2);
    });

    it("después de leerla, un mensaje nuevo abre otra notificación", async () => {
      await escribir(comprador, "Hola");
      const [primera] = await deUsuario(organizador);
      await service.marcarLeida(primera.id, organizador);
      avanzar();

      await escribir(comprador, "¿Sigue en pie?");

      const notificaciones = await deUsuario(organizador);
      expect(notificaciones).toHaveLength(2);
      expect(notificaciones[0]).toMatchObject({
        cantidad: 1,
        leida: false,
        titulo: "Sofía te escribió por Recital",
        cuerpo: "¿Sigue en pie?",
      });
      expect(notificaciones[1]).toMatchObject({ id: primera.id, leida: true, cantidad: 1 });
    });

    it("los mensajes de otra compra van en otra notificación", async () => {
      const otraCompra = unaCompra({ id: "c-2", evento, comprador });
      await escribir(comprador, "Hola");

      await service.avisarMensajeNuevo(otraCompra, otraCompra.enviarMensaje("Hola", comprador, reloj));

      expect(await deUsuario(organizador)).toHaveLength(2);
    });

    it("recorta un mensaje largo a 120 caracteres", async () => {
      await escribir(comprador, `${"a".repeat(100)} ${"b".repeat(100)}`);

      const [notificacion] = await deUsuario(organizador);

      expect([...notificacion.cuerpo]).toHaveLength(120);
      expect(notificacion.cuerpo).toBe(`${"a".repeat(100)} ${"b".repeat(18)}…`);
    });

    it("no corta un emoji a la mitad", async () => {
      await escribir(comprador, "🎸".repeat(130));

      const [notificacion] = await deUsuario(organizador);

      expect(notificacion.cuerpo).toBe(`${"🎸".repeat(119)}…`);
    });
  });

  describe("avisarAgotado", () => {
    let general;
    let vip;
    let evento;

    beforeEach(() => {
      general = unTipoEntrada({ id: "t-general", nombre: "General", cupo: 2 });
      vip = unTipoEntrada({ id: "t-vip", nombre: "VIP", cupo: 1 });
      evento = unEvento({ nombre: "Recital", organizador, tiposEntrada: [general, vip] });
    });

    it("avisa una sola vez por tipo de entrada", async () => {
      vip.reservar(1);

      await service.avisarAgotado(evento, vip);
      await service.avisarAgotado(evento, vip);

      expect(await deUsuario(organizador)).toEqual([
        expect.objectContaining({
          tipo: TipoNotificacion.ENTRADAS_AGOTADAS,
          titulo: "Se agotaron las entradas VIP",
          cuerpo: "Ya no quedan entradas VIP para Recital.",
          evento,
          compra: null,
        }),
      ]);
    });

    it("si se agota el último tipo, avisa que el evento está agotado y no repite", async () => {
      vip.reservar(1);
      await service.avisarAgotado(evento, vip);
      general.reservar(2);

      await service.avisarAgotado(evento, general);
      await service.avisarAgotado(evento, general);

      const notificaciones = await deUsuario(organizador);
      expect(notificaciones.map((n) => n.tipo).sort()).toEqual([
        TipoNotificacion.ENTRADAS_AGOTADAS,
        TipoNotificacion.EVENTO_AGOTADO,
      ]);
      expect(notificaciones.find((n) => n.tipo === TipoNotificacion.EVENTO_AGOTADO)).toMatchObject({
        titulo: "Recital está agotado",
        cuerpo: "No quedan entradas de ningún tipo.",
        compra: null,
      });
    });

    it("el tipo que agotó el evento no vuelve a avisar si se libera y se agota otra vez", async () => {
      vip.reservar(1);
      await service.avisarAgotado(evento, vip);
      general.reservar(2);
      await service.avisarAgotado(evento, general);
      vip.liberar(1);
      general.liberar(2);

      general.reservar(2);
      await service.avisarAgotado(evento, general);

      expect(await deUsuario(organizador)).toHaveLength(2);
    });

    it("dos tipos que se agotan juntos avisan una sola vez que el evento está agotado", async () => {
      vip.reservar(1);
      general.reservar(2);

      await Promise.all([service.avisarAgotado(evento, vip), service.avisarAgotado(evento, general)]);

      expect((await deUsuario(organizador)).map((n) => n.tipo)).toEqual([TipoNotificacion.EVENTO_AGOTADO]);
    });

    it("no avisa si al tipo todavía le quedan entradas", async () => {
      general.reservar(1);

      await service.avisarAgotado(evento, general);

      expect(await deUsuario(organizador)).toEqual([]);
    });
  });

  describe("consultas", () => {
    const evento = unEvento({ nombre: "Recital", organizador });
    let compraA;
    let compraB;

    beforeEach(async () => {
      compraA = unaCompra({ id: "c-a", evento, comprador });
      compraB = unaCompra({ id: "c-b", evento, comprador });
      await service.avisarPagoConfirmado(compraA);
      avanzar();
      await service.avisarPagoConfirmado(compraB);
      avanzar();
      await service.avisarEntradaUtilizada(compraA);
    });

    it("listar devuelve solo las del usuario, la más reciente primero y paginadas", async () => {
      const pagina = await service.listar(comprador, { page: 1, pageSize: 2 });
      const ajenas = await service.listar(organizador, { page: 1, pageSize: 20 });

      expect(pagina.total).toBe(3);
      expect(pagina.data.map((n) => [n.tipo, n.compra.id])).toEqual([
        [TipoNotificacion.ENTRADA_UTILIZADA, "c-a"],
        [TipoNotificacion.PAGO_CONFIRMADO, "c-b"],
      ]);
      expect(ajenas.total).toBe(0);
    });

    it("listar con soloNoLeidas deja afuera las leídas", async () => {
      const [ultima] = await deUsuario(comprador);
      await service.marcarLeida(ultima.id, comprador);

      const pagina = await service.listar(comprador, { soloNoLeidas: true, page: 1, pageSize: 20 });

      expect(pagina.total).toBe(2);
      expect(pagina.data.every((n) => !n.leida)).toBe(true);
    });

    it("contarNoLeidas cuenta solo las del usuario sin leer", async () => {
      const [ultima] = await deUsuario(comprador);
      await service.marcarLeida(ultima.id, comprador);

      expect(await service.contarNoLeidas(comprador)).toBe(2);
      expect(await service.contarNoLeidas(organizador)).toBe(0);
    });

    it("marcarLeida devuelve la notificación leída", async () => {
      const [ultima] = await deUsuario(comprador);

      const leida = await service.marcarLeida(ultima.id, comprador);

      expect(leida).toMatchObject({ id: ultima.id, leida: true });
    });

    it("marcarLeida de una notificación ajena responde que no existe", async () => {
      const [ajena] = await deUsuario(comprador);

      await expect(service.marcarLeida(ajena.id, organizador)).rejects.toThrow(
        new NoEncontradoError("No encontramos esa notificación"),
      );
      await expect(service.marcarLeida("no-existe", comprador)).rejects.toThrow(NoEncontradoError);
      expect((await deUsuario(comprador))[0].leida).toBe(false);
    });

    it("marcarLeidas marca todas las del usuario y devuelve cuántas", async () => {
      const marcadas = await service.marcarLeidas(comprador);

      expect(marcadas).toBe(3);
      expect(await service.contarNoLeidas(comprador)).toBe(0);
      expect(await service.marcarLeidas(comprador)).toBe(0);
    });

    it("marcarLeidas con compraId solo marca las de esa compra", async () => {
      const marcadas = await service.marcarLeidas(comprador, { compraId: "c-a" });

      expect(marcadas).toBe(2);
      expect((await deUsuario(comprador)).map((n) => [n.compra.id, n.leida])).toEqual([
        ["c-a", true],
        ["c-b", false],
        ["c-a", true],
      ]);
    });
  });
});
