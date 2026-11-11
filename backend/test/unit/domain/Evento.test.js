import { EstadoEvento } from "../../../src/domain/Evento.js";
import { ValidacionError } from "../../../src/errors/index.js";
import { unEvento, unOrganizador, unReloj, unTipoEntrada, unUsuario } from "../../helpers/fabricas.js";

describe("Evento", () => {
  const evento = unEvento({
    tiposEntrada: [
      unTipoEntrada({ id: "t-general", nombre: "General", precio: 5000 }),
      unTipoEntrada({ id: "t-vip", nombre: "VIP", precio: 20000 }),
    ],
  });

  it("precioDesde es el precio del tipo de entrada más barato", () => {
    expect(evento.precioDesde()).toBe(5000);
  });

  it("tuPrecioEstaEntre es verdadero si algún tipo de entrada cae en el rango", () => {
    expect(evento.tuPrecioEstaEntre(1000, 6000)).toBe(true);
    expect(evento.tuPrecioEstaEntre(15000, 30000)).toBe(true);
    expect(evento.tuPrecioEstaEntre(6000, 15000)).toBe(false);
  });

  it("tuPrecioEstaEntre acepta rangos abiertos", () => {
    expect(evento.tuPrecioEstaEntre(undefined, 5000)).toBe(true);
    expect(evento.tuPrecioEstaEntre(25000, undefined)).toBe(false);
  });

  it("encuentra un tipo de entrada por id", () => {
    expect(evento.tipoEntrada("t-vip").nombre).toBe("VIP");
    expect(evento.tipoEntrada("no-existe")).toBeUndefined();
  });

  it("yaSeRealizo compara la fecha del evento con el reloj", () => {
    const fecha = new Date("2026-12-10T21:00:00-03:00");
    const e = unEvento({ fecha });

    expect(e.yaSeRealizo(unReloj("2026-12-10T20:59:59-03:00"))).toBe(false);
    expect(e.yaSeRealizo(unReloj("2026-12-10T21:00:00-03:00"))).toBe(true);
  });

  it("agotado es verdadero solo si no quedan disponibles de ningún tipo", () => {
    const general = unTipoEntrada({ id: "t-general", nombre: "General", cupo: 2 });
    const vip = unTipoEntrada({ id: "t-vip", nombre: "VIP", cupo: 1 });
    const e = unEvento({ tiposEntrada: [general, vip] });

    vip.reservar(1);
    const conUnTipoAgotado = e.agotado();
    general.reservar(2);
    const sinNingunDisponible = e.agotado();
    general.liberar(1);
    const conUnoLiberado = e.agotado();

    expect(conUnTipoAgotado).toBe(false);
    expect(sinNingunDisponible).toBe(true);
    expect(conUnoLiberado).toBe(false);
  });

  it("sabe quién es su organizador", () => {
    expect(evento.esOrganizadoPor(unOrganizador())).toBe(true);
    expect(evento.esOrganizadoPor(unUsuario())).toBe(false);
  });

  it("exige al menos un tipo de entrada y sin nombres repetidos", () => {
    expect(() => unEvento({ tiposEntrada: [] })).toThrow(ValidacionError);
    expect(() =>
      unEvento({
        tiposEntrada: [
          unTipoEntrada({ id: "a", nombre: "VIP" }),
          unTipoEntrada({ id: "b", nombre: " vip " }),
        ],
      }),
    ).toThrow("Hay tipos de entrada con el mismo nombre");
  });

  describe("posponer y cancelar", () => {
    const reloj = unReloj();
    const FECHA = new Date("2026-12-10T21:00:00-03:00");
    const DESPUES_DEL_EVENTO = unReloj("2026-12-11T00:00:00-03:00");

    it("un evento nuevo está PROGRAMADO", () => {
      const e = unEvento();

      expect(e.estado).toBe(EstadoEvento.PROGRAMADO);
      expect(e.estaCancelado()).toBe(false);
    });

    it("posponer cambia la fecha, queda POSPUESTO y devuelve la anterior", () => {
      const e = unEvento({ fecha: FECHA });
      const nuevaFecha = new Date("2026-12-17T21:00:00-03:00");

      const anterior = e.posponer(nuevaFecha, reloj);

      expect(anterior).toEqual(FECHA);
      expect(e.fecha).toEqual(nuevaFecha);
      expect(e.estado).toBe(EstadoEvento.POSPUESTO);
    });

    // El reloj marca el 1/11/2026 a las 12:00: la fecha más próxima posible es el 3/11 a las 12:00.
    it("se puede pasar a una fecha anterior a la actual, si falta al menos 2 días", () => {
      const e = unEvento({ fecha: FECHA });
      const enDosDias = new Date("2026-11-03T12:00:00-03:00");

      const anterior = e.posponer(enDosDias, reloj);

      expect(anterior).toEqual(FECHA);
      expect(e.fecha).toEqual(enDosDias);
      expect(e.estado).toBe(EstadoEvento.POSPUESTO);
    });

    it("no se puede pasar a una fecha que esté a menos de 2 días", () => {
      const e = unEvento({ fecha: FECHA });

      expect(() => e.posponer(new Date("2026-11-03T11:59:00-03:00"), reloj)).toThrow(
        new ValidacionError("La nueva fecha tiene que ser dentro de 2 días como mínimo"),
      );
      expect(() => e.posponer(new Date("2026-10-30T21:00:00-03:00"), reloj)).toThrow(ValidacionError);
      expect(e.fecha).toEqual(FECHA);
      expect(e.estado).toBe(EstadoEvento.PROGRAMADO);
    });

    it("no se puede posponer a la misma fecha", () => {
      const e = unEvento({ fecha: FECHA });

      expect(() => e.posponer(new Date(FECHA), reloj)).toThrow(
        new ValidacionError("La nueva fecha tiene que ser distinta de la actual"),
      );
      expect(e.estado).toBe(EstadoEvento.PROGRAMADO);
    });

    it("cancelar lo deja CANCELADO", () => {
      const e = unEvento();

      e.cancelar(reloj);

      expect(e.estado).toBe(EstadoEvento.CANCELADO);
      expect(e.estaCancelado()).toBe(true);
    });

    it("no se puede posponer ni cancelar un evento que ya se realizó", () => {
      const e = unEvento({ fecha: FECHA });
      const finalizado = expect.objectContaining({ codigo: "EVENTO_FINALIZADO" });

      expect(() => e.posponer(new Date("2026-12-20T21:00:00-03:00"), DESPUES_DEL_EVENTO)).toThrow(finalizado);
      expect(() => e.cancelar(DESPUES_DEL_EVENTO)).toThrow(finalizado);
      expect(e.estado).toBe(EstadoEvento.PROGRAMADO);
    });

    it("no se puede posponer ni cancelar un evento cancelado", () => {
      const e = unEvento({ fecha: FECHA });
      e.cancelar(reloj);
      const cancelado = expect.objectContaining({
        codigo: "EVENTO_CANCELADO",
        message: "El evento fue cancelado",
      });

      expect(() => e.posponer(new Date("2026-12-20T21:00:00-03:00"), reloj)).toThrow(cancelado);
      expect(() => e.cancelar(reloj)).toThrow(cancelado);
      expect(e.fecha).toEqual(FECHA);
    });
  });
});
