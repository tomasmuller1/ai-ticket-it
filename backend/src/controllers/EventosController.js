import { eventoToDTO } from "../dtos/eventoDTO.js";

export class EventosController {
  constructor(eventosService) {
    this.eventosService = eventosService;
  }

  listar = async (req, res) => {
    const eventos = await this.eventosService.listar();
    res.json(eventos.map(eventoToDTO));
  };

  obtener = async (req, res) => {
    const evento = await this.eventosService.obtener(req.validado.params.id);
    res.json(eventoToDTO(evento));
  };
}
