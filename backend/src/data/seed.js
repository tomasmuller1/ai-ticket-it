import { Categoria } from "../domain/Categoria.js";
import { Evento } from "../domain/Evento.js";
import { TipoEntrada } from "../domain/TipoEntrada.js";
import { Usuario } from "../domain/Usuario.js";

// Datos de ejemplo para arrancar la app con contenido.
export function eventosDeEjemplo() {
  const musica = new Categoria({ id: "musica", nombre: "Música" });
  const teatro = new Categoria({ id: "teatro", nombre: "Teatro" });
  const conferencias = new Categoria({ id: "conferencias", nombre: "Conferencias" });
  const rockeros = new Usuario({
    id: "org-1",
    nombre: "Lucía",
    apellido: "Fernández",
    email: "lucia@aiticketit.com",
  });
  const humor = new Usuario({
    id: "org-2",
    nombre: "Martín",
    apellido: "Gómez",
    email: "martin@aiticketit.com",
  });

  return [
    new Evento({
      id: "1",
      nombre: "Recital de Rock Nacional",
      descripcion: "Una noche con las mejores bandas del rock argentino.",
      categoria: musica,
      fecha: "2026-12-12T21:00:00-03:00",
      lugar: "Estadio Obras, CABA",
      organizador: rockeros,
      tiposEntrada: [
        new TipoEntrada({ id: "1-general", nombre: "General", precio: 35000, cupo: 500 }),
        new TipoEntrada({ id: "1-vip", nombre: "VIP", precio: 80000, cupo: 50 }),
      ],
    }),
    new Evento({
      id: "2",
      nombre: "Stand Up: Noche de Humor",
      descripcion: "Tres comediantes, una noche, cero filtro.",
      categoria: teatro,
      fecha: "2026-11-20T22:00:00-03:00",
      lugar: "Teatro Gran Rex, CABA",
      organizador: humor,
      tiposEntrada: [
        new TipoEntrada({ id: "2-platea", nombre: "Platea", precio: 25000, cupo: 300 }),
        new TipoEntrada({ id: "2-pullman", nombre: "Pullman", precio: 18000, cupo: 200 }),
      ],
    }),
    new Evento({
      id: "3",
      nombre: "Conferencia de IA aplicada",
      descripcion: "Charlas sobre desarrollo de software con inteligencia artificial.",
      categoria: conferencias,
      fecha: "2027-01-15T10:00:00-03:00",
      lugar: "UTN FRBA, Medrano 951",
      organizador: rockeros,
      tiposEntrada: [new TipoEntrada({ id: "3-general", nombre: "General", precio: 10000, cupo: 150 })],
    }),
  ];
}
