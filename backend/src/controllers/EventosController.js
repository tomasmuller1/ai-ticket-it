import { eventoToDTO } from "../dtos/eventoDTO.js";

export class EventosController {
  constructor(eventosService) {
    this.eventosService = eventosService;
  }

  listar = (req, res) => {
    const eventos = this.eventosService.listar();
    res.json(eventos.map(eventoToDTO));
  };

  obtener = (req, res) => {
    const evento = this.eventosService.obtener(req.params.id);
    res.json(eventoToDTO(evento));
  };
}
