import { Categoria } from "../../src/domain/Categoria.js";
import { Usuario } from "../../src/domain/Usuario.js";
import { Evento } from "../../src/domain/Evento.js";
import { TipoEntrada } from "../../src/domain/TipoEntrada.js";
import { Compra } from "../../src/domain/Compra.js";
import { RelojFijo } from "../../src/infra/Reloj.js";

// Datos de prueba con valores por defecto: cada test solo pisa lo que le importa.
export const HOY = "2026-11-01T12:00:00-03:00";

export function unReloj(fecha = HOY) {
  return new RelojFijo(fecha);
}

export function unUsuario(datos = {}) {
  return new Usuario({
    id: "u-comprador",
    nombre: "Ana",
    apellido: "García",
    email: "ana@mail.com",
    ...datos,
  });
}

export function unOrganizador(datos = {}) {
  return unUsuario({
    id: "u-organizador",
    nombre: "Luis",
    apellido: "Pérez",
    email: "luis@mail.com",
    ...datos,
  });
}

export function unaCategoria(datos = {}) {
  return new Categoria({ id: "musica", nombre: "Música", descripcion: "Recitales y festivales", ...datos });
}

export function unTipoEntrada(datos = {}) {
  return new TipoEntrada({
    id: "t-general",
    nombre: "General",
    descripcion: "Campo",
    precio: 1000,
    cupo: 100,
    ...datos,
  });
}

export function unEvento(datos = {}) {
  return new Evento({
    id: "e-1",
    nombre: "Recital",
    descripcion: "Un recital",
    categoria: unaCategoria(),
    fecha: new Date("2026-12-10T21:00:00-03:00"),
    lugar: "Estadio",
    multimedia: [],
    organizador: unOrganizador(),
    tiposEntrada: [unTipoEntrada()],
    ...datos,
  });
}

export function unaCompra({
  evento = unEvento(),
  comprador = unUsuario(),
  cantidad = 2,
  reloj = unReloj(),
} = {}) {
  return Compra.crear({
    id: "c-1",
    comprador,
    evento,
    tipoEntradaId: evento.tiposEntrada[0].id,
    cantidad,
    reloj,
  });
}
