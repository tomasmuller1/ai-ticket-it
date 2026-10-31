import { Evento } from "../domain/Evento.js";
import { TipoEntrada } from "../domain/TipoEntrada.js";

// Datos de ejemplo para arrancar la app con contenido.
export function eventosDeEjemplo() {
  return [
    new Evento({
      id: "1",
      titulo: "Recital de Rock Nacional",
      descripcion: "Una noche con las mejores bandas del rock argentino.",
      categoria: "Música",
      fecha: "2026-12-12T21:00:00-03:00",
      lugar: "Estadio Obras, CABA",
      organizadorId: "org-1",
      tiposEntrada: [
        new TipoEntrada({ id: "1-general", nombre: "General", precio: 35000, cupo: 500 }),
        new TipoEntrada({ id: "1-vip", nombre: "VIP", precio: 80000, cupo: 50 }),
      ],
    }),
    new Evento({
      id: "2",
      titulo: "Stand Up: Noche de Humor",
      descripcion: "Tres comediantes, una noche, cero filtro.",
      categoria: "Teatro",
      fecha: "2026-11-20T22:00:00-03:00",
      lugar: "Teatro Gran Rex, CABA",
      organizadorId: "org-2",
      tiposEntrada: [
        new TipoEntrada({ id: "2-platea", nombre: "Platea", precio: 25000, cupo: 300 }),
        new TipoEntrada({ id: "2-pullman", nombre: "Pullman", precio: 18000, cupo: 200 }),
      ],
    }),
    new Evento({
      id: "3",
      titulo: "Conferencia de IA aplicada",
      descripcion: "Charlas sobre desarrollo de software con inteligencia artificial.",
      categoria: "Conferencias",
      fecha: "2027-01-15T10:00:00-03:00",
      lugar: "UTN FRBA, Medrano 951",
      organizadorId: "org-1",
      tiposEntrada: [new TipoEntrada({ id: "3-general", nombre: "General", precio: 10000, cupo: 150 })],
    }),
  ];
}
