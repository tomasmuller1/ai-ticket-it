import {
  categoriaDTO,
  eventoDeOrganizadorDTO,
  eventoDetalleDTO,
  eventoResumenDTO,
  reseniaDTO,
} from "../dtos/eventoDTO.js";
import { SIN_RESENIAS } from "../services/ReseniasService.js";

export class EventosController {
  constructor(eventosService, reseniasService) {
    this.eventosService = eventosService;
    this.reseniasService = reseniasService;
  }

  buscar = async (req, res) => {
    const { reputaciones, ...pagina } = await this.eventosService.buscar(req.validado.query);
    res.json({
      ...pagina,
      data: pagina.data.map((evento) =>
        eventoResumenDTO(evento, reputaciones.get(evento.organizador.id) ?? SIN_RESENIAS),
      ),
    });
  };

  detalle = async (req, res) => {
    const detalle = await this.eventosService.obtenerDetalle(req.validado.params.id);
    res.json(eventoDetalleDTO(detalle));
  };

  crear = async (req, res) => {
    const evento = await this.eventosService.crear(req.validado.body, req.usuario);
    const detalle = await this.eventosService.obtenerDetalle(evento.id);
    res.status(201).location(`/api/eventos/${evento.id}`).json(eventoDetalleDTO(detalle));
  };

  mios = async (req, res) => {
    const eventos = await this.eventosService.listarDeOrganizador(req.usuario);
    res.json(eventos.map(eventoDeOrganizadorDTO));
  };
}

export class CategoriasController {
  constructor(categoriasService) {
    this.categoriasService = categoriasService;
  }

  listar = async (req, res) => {
    const categorias = await this.categoriasService.listar();
    res.json(categorias.map(categoriaDTO));
  };
}

export class OrganizadoresController {
  constructor(reseniasService) {
    this.reseniasService = reseniasService;
  }

  resenias = async (req, res) => {
    const { page, pageSize } = req.validado.query;
    const pagina = await this.reseniasService.listarDeOrganizador(req.validado.params.id, { page, pageSize });
    res.json({ ...pagina, data: pagina.data.map(reseniaDTO) });
  };
}
