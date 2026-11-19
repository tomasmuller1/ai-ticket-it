import { crearDatosDeEjemplo } from "../../src/data/seed.js";
import { EstadoEvento } from "../../src/domain/Evento.js";
import { EstadoCompra } from "../../src/domain/estados/EstadoCompra.js";
import {
  textoCompraDevuelta,
  textoEntradaUtilizada,
  textoEventoAgotado,
  textoEventoCancelado,
  textoMensajeNuevo,
  textoPagoConfirmado,
  textoReembolso,
} from "../../src/domain/textosNotificacion.js";
import { formatearFecha } from "../../src/utils/formato.js";
import { unReloj } from "../helpers/fabricas.js";

const ACTIVAS = [EstadoCompra.PENDIENTE, EstadoCompra.CONFIRMADA, EstadoCompra.UTILIZADA];

// Cuántos mensajes seguidos escribió la misma persona al final del chat: es lo que junta un MENSAJE_NUEVO.
function mensajesSeguidosAlFinal(compra) {
  const autor = compra.mensajes.at(-1).usuario;
  let cantidad = 0;
  for (let i = compra.mensajes.length - 1; i >= 0 && compra.mensajes[i].usuario.es(autor); i -= 1) {
    cantidad += 1;
  }
  return cantidad;
}

describe.each([
  ["de base", false],
  ["completos", true],
])("Datos de ejemplo %s", (_nombre, completos) => {
  const reloj = unReloj();
  const datos = crearDatosDeEjemplo(reloj, { completos });

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
        const activas = datos.compras.filter((c) => c.tipoEntrada === tipo && ACTIVAS.includes(c.estado));
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

  it("no repite ids ni emails", () => {
    for (const [coleccion, items] of Object.entries(datos)) {
      const ids = items.map((item) => item.id);
      expect({ coleccion, repetidos: ids.filter((id, i) => ids.indexOf(id) !== i) }).toEqual({
        coleccion,
        repetidos: [],
      });
    }
    const emails = datos.usuarios.map((usuario) => usuario.email);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("ningún mensaje ni cambio de estado queda en el futuro", () => {
    const ahora = reloj.ahora();
    for (const compra of datos.compras) {
      const fechas = [...compra.historial.map((c) => c.fechaHora), ...compra.mensajes.map((m) => m.enviado)];
      expect({ compra: compra.id, futuras: fechas.filter((fecha) => fecha > ahora) }).toEqual({
        compra: compra.id,
        futuras: [],
      });
    }
  });

  describe("notificaciones", () => {
    // Los textos con un motivo o una fecha anterior se comparan por la parte que no depende de eso.
    const textoDe = {
      REEMBOLSO_REALIZADO: ({ compra }) => textoReembolso(compra),
      PAGO_CONFIRMADO: ({ compra }) => textoPagoConfirmado(compra),
      ENTRADA_UTILIZADA: ({ compra }) => textoEntradaUtilizada(compra),
      COMPRA_DEVUELTA: ({ compra }) => textoCompraDevuelta(compra),
      EVENTO_AGOTADO: ({ evento }) => textoEventoAgotado(evento),
      MENSAJE_NUEVO: ({ compra, cantidad }) => textoMensajeNuevo(compra, compra.mensajes.at(-1), cantidad),
    };

    it("sus textos salen de las mismas funciones que usa el service", () => {
      for (const notificacion of datos.notificaciones) {
        const { id, tipo, titulo, cuerpo, compra, evento } = notificacion;
        if (tipo === "EVENTO_CANCELADO") {
          const esperado = textoEventoCancelado(compra);
          expect({ id, titulo }).toEqual({ id, titulo: esperado.titulo });
          expect(cuerpo.startsWith(esperado.cuerpo)).toBe(true);
        } else if (tipo === "EVENTO_POSPUESTO") {
          expect({ id, titulo }).toEqual({ id, titulo: `${evento.nombre} se pospuso` });
          expect(cuerpo.startsWith(`La nueva fecha es ${formatearFecha(evento.fecha)}`)).toBe(true);
        } else {
          expect({ id, titulo, cuerpo }).toEqual({ id, ...textoDe[tipo](notificacion) });
        }
      }
    });

    it("cada una es de una parte de su compra y coincide con lo que pasó en ella", () => {
      for (const notificacion of datos.notificaciones) {
        const { compra, tipo, destinatario } = notificacion;
        if (!compra) {
          expect(notificacion.evento.esOrganizadoPor(destinatario)).toBe(true);
          continue;
        }
        expect({ id: notificacion.id, puedeVer: compra.puedeVer(destinatario) }).toEqual({
          id: notificacion.id,
          puedeVer: true,
        });
        if (tipo === "MENSAJE_NUEVO") {
          const ultimo = compra.mensajes.at(-1);
          expect(ultimo.usuario.es(destinatario)).toBe(false);
          expect(notificacion.cantidad).toBe(mensajesSeguidosAlFinal(compra));
          expect(notificacion.fechaHora).toEqual(ultimo.enviado);
        }
        if (tipo === "PAGO_CONFIRMADO") expect(compra.fuePagada).toBe(true);
        if (tipo === "REEMBOLSO_REALIZADO") expect(compra.estado).toBe(EstadoCompra.REEMBOLSADA);
        if (tipo === "ENTRADA_UTILIZADA") expect(compra.estado).toBe(EstadoCompra.UTILIZADA);
        if (tipo === "COMPRA_DEVUELTA") expect(compra.evento.esOrganizadoPor(destinatario)).toBe(true);
      }
    });
  });
});

describe("Notificaciones de ejemplo de base", () => {
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
});

describe("Datos de ejemplo completos", () => {
  const reloj = unReloj();
  const base = crearDatosDeEjemplo(reloj);
  const datos = crearDatosDeEjemplo(reloj, { completos: true });
  const ids = (items) => items.map((item) => item.id);

  it("incluyen todos los de base y muchos más", () => {
    for (const coleccion of ["usuarios", "eventos", "compras", "resenias", "notificaciones", "tarjetas"]) {
      expect(ids(datos[coleccion])).toEqual(expect.arrayContaining(ids(base[coleccion])));
    }
    expect(datos.usuarios.length).toBeGreaterThanOrEqual(3 * base.usuarios.length);
    expect(datos.eventos.length).toBeGreaterThanOrEqual(3 * base.eventos.length);
    expect(datos.compras.length).toBeGreaterThanOrEqual(8 * base.compras.length);
    expect(datos.resenias.length).toBeGreaterThanOrEqual(5 * base.resenias.length);
  });

  it("no tocan las compras de base, de las que dependen los ejemplos de la documentación", () => {
    for (const compra of base.compras) {
      const misma = datos.compras.find((c) => c.id === compra.id);
      expect([misma.estado, misma.cantidad, misma.mensajes.length]).toEqual([
        compra.estado,
        compra.cantidad,
        compra.mensajes.length,
      ]);
    }
  });

  it("tienen eventos de todas las categorías, uno pospuesto, uno cancelado y uno agotado", () => {
    const categorias = new Set(datos.eventos.map((evento) => evento.categoria.id));
    expect([...categorias].sort()).toEqual(ids(datos.categorias).sort());
    expect(datos.eventos.some((evento) => evento.estado === EstadoEvento.POSPUESTO)).toBe(true);
    expect(datos.eventos.some((evento) => evento.agotado())).toBe(true);

    const cancelado = datos.eventos.find((evento) => evento.estado === EstadoEvento.CANCELADO);
    const suyas = datos.compras.filter((compra) => compra.evento === cancelado);
    expect(suyas.length).toBeGreaterThan(0);
    expect(suyas.every((compra) => !compra.vigente && !compra.requiereReembolso())).toBe(true);
  });

  it("tienen chats largos, con mensajes de las dos partes", () => {
    const largos = datos.compras.filter(
      (compra) =>
        compra.mensajes.length >= 4 &&
        compra.mensajes.some((m) => m.usuario.es(compra.comprador)) &&
        compra.mensajes.some((m) => m.usuario.es(compra.evento.organizador)),
    );

    expect(largos.length).toBeGreaterThanOrEqual(5);
  });

  it("cada organizador con eventos realizados tiene reseñas, así el orden por puntaje sirve", () => {
    const conRealizados = new Set(
      datos.eventos.filter((evento) => evento.yaSeRealizo(reloj)).map((evento) => evento.organizador.id),
    );
    const reseniados = new Set(datos.resenias.map((resenia) => resenia.evento.organizador.id));

    expect([...conRealizados].filter((id) => !reseniados.has(id))).toEqual([]);
  });
});
