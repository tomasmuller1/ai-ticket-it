import {
  categoriaDTO,
  eventoDeOrganizadorDTO,
  eventoDetalleDTO,
  eventoResumenDTO,
  reseniaDTO,
} from "../dtos/eventoDTO.js";
import { SIN_RESENIAS } from "../services/ReseniasService.js";

export class EventosController {
  constructor(eventosService, reseniasService, reloj) {
    this.eventosService = eventosService;
    this.reseniasService = reseniasService;
    this.reloj = reloj;
  }

  buscar = async (req, res) => {
    const { reputaciones, ...pagina } = await this.eventosService.buscar(req.validado.query);
    res.json({
      ...pagina,
      data: pagina.data.map((evento) =>
        eventoResumenDTO(evento, reputaciones.get(evento.organizador.id) ?? SIN_RESENIAS, this.reloj),
      ),
    });
  };

  detalle = async (req, res) => {
    const detalle = await this.eventosService.obtenerDetalle(req.validado.params.id);
    res.json(eventoDetalleDTO(detalle, this.reloj));
  };

  crear = async (req, res) => {
    const evento = await this.eventosService.crear(req.validado.body, req.usuario);
    const detalle = await this.eventosService.obtenerDetalle(evento.id);
    res.status(201).location(`/api/eventos/${evento.id}`).json(eventoDetalleDTO(detalle, this.reloj));
  };

  mios = async (req, res) => {
    const eventos = await this.eventosService.listarDeOrganizador(req.usuario);
    res.json(eventos.map((evento) => eventoDeOrganizadorDTO(evento, this.reloj)));
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
