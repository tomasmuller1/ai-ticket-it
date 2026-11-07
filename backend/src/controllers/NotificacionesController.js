import { notificacionDTO } from "../dtos/notificacionDTO.js";

export class NotificacionesController {
  constructor(notificacionesService) {
    this.notificacionesService = notificacionesService;
  }

  listar = async (req, res) => {
    const pagina = await this.notificacionesService.listar(req.usuario, req.validado.query);
    res.json({ ...pagina, data: pagina.data.map(notificacionDTO) });
  };

  resumen = async (req, res) => {
    res.json({ noLeidas: await this.notificacionesService.contarNoLeidas(req.usuario) });
  };

  marcarLeidas = async (req, res) => {
    res.json({ marcadas: await this.notificacionesService.marcarLeidas(req.usuario, req.validado.body) });
  };

  marcarLeida = async (req, res) => {
    const notificacion = await this.notificacionesService.marcarLeida(req.validado.params.id, req.usuario);
    res.json(notificacionDTO(notificacion));
  };
}
