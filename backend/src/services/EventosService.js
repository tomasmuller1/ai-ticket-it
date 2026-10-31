import { randomUUID } from "node:crypto";

import { Evento } from "../domain/Evento.js";
import { TipoEntrada } from "../domain/TipoEntrada.js";
import { ordenarEventos } from "../domain/OrdenEventos.js";
import { NoEncontradoError, ValidacionError } from "../errors/index.js";
import { paginar } from "../utils/paginar.js";
import { normalizar } from "../utils/texto.js";

const RESENIAS_EN_DETALLE = 5;

export class EventosService {
  constructor({ eventos, categorias }, reseniasService, reloj) {
    this.eventos = eventos;
    this.categorias = categorias;
    this.reseniasService = reseniasService;
    this.reloj = reloj;
  }

  // CU3 y CU11: búsqueda por texto, filtros, orden y paginación. Por defecto solo eventos próximos.
  async buscar({ q, categoria, precioMin, precioMax, orden, dir, incluirPasados, page, pageSize }) {
    const texto = q ? normalizar(q) : null;
    const candidatos = (await this.eventos.buscarTodos()).filter(
      (evento) =>
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

  async listarDeOrganizador(organizador) {
    const eventos = await this.eventos.buscarPorOrganizador(organizador.id);
    return eventos.sort((a, b) => a.fecha - b.fecha);
  }

  #coincide(evento, texto) {
    return [evento.nombre, evento.descripcion, evento.lugar, evento.categoria.nombre].some((campo) =>
      normalizar(campo).includes(texto),
    );
  }
}
