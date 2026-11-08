import { randomUUID } from "node:crypto";

import { Evento } from "../domain/Evento.js";
import { TipoEntrada } from "../domain/TipoEntrada.js";
import { ordenarEventos } from "../domain/OrdenEventos.js";
import { NoEncontradoError, ProhibidoError, ValidacionError } from "../errors/index.js";
import { paginar } from "../utils/paginar.js";
import { normalizar } from "../utils/texto.js";

const RESENIAS_EN_DETALLE = 5;

export class EventosService {
  constructor({ eventos, categorias, compras }, reseniasService, reloj, comprasService, notificaciones) {
    this.eventos = eventos;
    this.categorias = categorias;
    this.compras = compras;
    this.reseniasService = reseniasService;
    this.reloj = reloj;
    this.comprasService = comprasService;
    // Los avisos van después de guardar y nunca lanzan: no pueden romper la operación.
    this.notificaciones = notificaciones;
  }

  // CU3 y CU11: búsqueda por texto, filtros, orden y paginación. Por defecto solo eventos próximos. Los
  // cancelados no se buscan nunca; favoritos, "Mis eventos" y el detalle los siguen mostrando.
  async buscar({ q, categoria, precioMin, precioMax, orden, dir, incluirPasados, page, pageSize }) {
    const texto = q ? normalizar(q) : null;
    const candidatos = (await this.eventos.buscarTodos()).filter(
      (evento) =>
        !evento.estaCancelado() &&
        (incluirPasados || !evento.yaSeRealizo(this.reloj)) &&
        (!categoria || evento.categoria.id === categoria) &&
        evento.tuPrecioEstaEntre(precioMin, precioMax) &&
        (!texto || this.#coincide(evento, texto)),
    );
    const reputaciones = await this.reseniasService.reputaciones();
    const ordenados = ordenarEventos(candidatos, { orden, dir }, { reputaciones });
    return { ...paginar(ordenados, { page, pageSize }), reputaciones };
  }

  async obtener(id) {
    const evento = await this.eventos.buscarPorId(id);
    if (!evento) {
      throw new NoEncontradoError(`No existe el evento ${id}`);
    }
    return evento;
  }

  // CU10: el detalle muestra la reputación del organizador y sus últimas reseñas.
  async obtenerDetalle(id) {
    const evento = await this.obtener(id);
    const organizadorId = evento.organizador.id;
    const [reputacion, resenias] = await Promise.all([
      this.reseniasService.reputacionDe(organizadorId),
      this.reseniasService.listarDeOrganizador(organizadorId, { page: 1, pageSize: RESENIAS_EN_DETALLE }),
    ]);
    return { evento, reputacion, reseniasRecientes: resenias.data };
  }

  // CU4: el organizador es el usuario autenticado.
  async crear(datos, organizador) {
    const categoria = await this.categorias.buscarPorId(datos.categoriaId);
    if (!categoria) {
      throw new ValidacionError(`No existe la categoría ${datos.categoriaId}`);
    }
    const fecha = new Date(datos.fecha);
    if (fecha <= this.reloj.ahora()) {
      throw new ValidacionError("La fecha del evento tiene que ser futura");
    }
    const evento = new Evento({
      id: randomUUID(),
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      categoria,
      fecha,
      lugar: datos.lugar,
      multimedia: datos.multimedia,
      organizador,
      tiposEntrada: datos.tiposEntrada.map((tipo) => new TipoEntrada({ id: randomUUID(), ...tipo })),
    });
    return this.eventos.guardar(evento);
  }

  // Primero los próximos (el más cercano arriba) y después los que ya se realizaron (el más reciente arriba).
  async listarDeOrganizador(organizador) {
    const eventos = await this.eventos.buscarPorOrganizador(organizador.id);
    const proximos = eventos.filter((e) => !e.yaSeRealizo(this.reloj)).sort((a, b) => a.fecha - b.fecha);
    const pasados = eventos.filter((e) => e.yaSeRealizo(this.reloj)).sort((a, b) => b.fecha - a.fecha);
    return [...proximos, ...pasados];
  }

  // Las entradas siguen valiendo: se le avisa a cada compra vigente y quien no pueda ir la cancela con
  // reembolso (CU7).
  async posponer(id, usuario, { fecha, motivo }) {
    const evento = await this.#obtenerParaGestionar(id, usuario);
    const fechaAnterior = evento.posponer(new Date(fecha), this.reloj);
    await this.eventos.guardar(evento);
    for (const compra of await this.#comprasVigentes(id)) {
      await this.notificaciones.avisarEventoPospuesto(compra, { fechaAnterior, motivo });
    }
    return evento;
  }

  // El evento no se va a hacer: se avisa a cada compra vigente y después se cancelan y se reembolsan. El evento
  // queda CANCELADO aunque la pasarela no responda: lo que falte lo termina el barrido.
  async cancelar(id, usuario, { motivo }) {
    const evento = await this.#obtenerParaGestionar(id, usuario);
    const vigentes = await this.#comprasVigentes(id);
    evento.cancelar(this.reloj);
    await this.eventos.guardar(evento);
    for (const compra of vigentes) {
      await this.notificaciones.avisarEventoCancelado(compra, { motivo });
    }
    await this.comprasService.resolverCancelacionDeEvento(id, usuario);
    return evento;
  }

  async #obtenerParaGestionar(id, usuario) {
    const evento = await this.obtener(id);
    if (!evento.esOrganizadoPor(usuario)) {
      throw new ProhibidoError("Solo el organizador puede gestionar este evento");
    }
    return evento;
  }

  async #comprasVigentes(eventoId) {
    return (await this.compras.buscarPorEvento(eventoId)).filter((compra) => compra.vigente);
  }

  #coincide(evento, texto) {
    return [evento.nombre, evento.descripcion, evento.lugar, evento.categoria.nombre].some((campo) =>
      normalizar(campo).includes(texto),
    );
  }
}
