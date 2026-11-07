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
        // El nombre va en el objeto para que, si falla, se vea de qué tipo de entrada se trata.
        expect({ tipo: `${evento.id}/${tipo.nombre}`, vendidas: tipo.vendidas }).toEqual({
          tipo: `${evento.id}/${tipo.nombre}`,
          vendidas: activas.reduce((t, c) => t + c.cantidad, 0),
        });
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

describe("Notificaciones de ejemplo", () => {
  const datos = crearDatosDeEjemplo(unReloj());
  const de = (usuarioId) => datos.notificaciones.filter((n) => n.destinatario.id === usuarioId);

  it("Sofía tiene dos sin leer y una leída; Lucía, una sin leer", () => {
    expect(de("u-sofia").map((n) => [n.id, n.leida])).toEqual([
      ["n-01", true],
      ["n-02", false],
      ["n-03", false],
    ]);
    expect(de("u-lucia").map((n) => [n.id, n.leida])).toEqual([["n-04", false]]);
  });

  it("cada una es de una parte de su compra y coincide con lo que pasó en ella", () => {
    for (const notificacion of datos.notificaciones) {
      const { compra, tipo, destinatario } = notificacion;
      expect({ id: notificacion.id, puedeVer: compra.puedeVer(destinatario) }).toEqual({
        id: notificacion.id,
        puedeVer: true,
      });
      if (tipo === "MENSAJE_NUEVO") {
        const ultimo = compra.mensajes.at(-1);
        expect(ultimo.usuario.es(destinatario)).toBe(false);
        expect(notificacion.cuerpo).toBe(ultimo.mensaje);
        expect(notificacion.fechaHora).toEqual(ultimo.enviado);
      }
      if (tipo === "PAGO_CONFIRMADO") expect(compra.fuePagada).toBe(true);
      if (tipo === "REEMBOLSO_REALIZADO") expect(compra.estado).toBe(EstadoCompra.REEMBOLSADA);
    }
  });
});
