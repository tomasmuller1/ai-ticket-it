import {
  compraDetalleDTO,
  compraDTO,
  comprasDeEventoDTO,
  mensajeDTO,
  usuarioDTO,
} from "../dtos/compraDTO.js";
import { eventoResumenDTO, reseniaDTO } from "../dtos/eventoDTO.js";
import { SIN_RESENIAS } from "../services/ReseniasService.js";

export class ComprasController {
  constructor(comprasService, reloj) {
    this.comprasService = comprasService;
    this.reloj = reloj;
  }

  crear = async (req, res) => {
    const compra = await this.comprasService.comprar(req.validado.body, req.usuario);
    res.status(201).location(`/api/compras/${compra.id}`).json(this.#detalle(compra, req));
  };

  misCompras = async (req, res) => {
    const compras = await this.comprasService.misCompras(req.usuario, req.validado.query);
    res.json(compras.map((compra) => compraDTO(compra, req.usuario, this.reloj)));
  };

  detalle = async (req, res) => {
    const compra = await this.comprasService.obtener(req.validado.params.id, req.usuario);
    res.json(this.#detalle(compra, req));
  };

  pagar = async (req, res) => {
    const compra = await this.comprasService.pagar(req.validado.params.id, req.usuario);
    res.json(this.#detalle(compra, req));
  };

  cancelar = async (req, res) => {
    const compra = await this.comprasService.cancelar(req.validado.params.id, req.usuario);
    res.json(this.#detalle(compra, req));
  };

  validarEntrada = async (req, res) => {
    const compra = await this.comprasService.validarEntrada(req.validado.params.id, req.usuario);
    res.json(this.#detalle(compra, req));
  };

  comprasDeEvento = async (req, res) => {
    const resultado = await this.comprasService.comprasDeEvento(
      req.validado.params.id,
      req.usuario,
      req.validado.query,
    );
    res.json(comprasDeEventoDTO(resultado, req.usuario, this.reloj));
  };

  mensajes = async (req, res) => {
    const mensajes = await this.comprasService.mensajes(
      req.validado.params.id,
      req.usuario,
      req.validado.query,
    );
    res.json(mensajes.map((mensaje) => mensajeDTO(mensaje, req.usuario)));
  };

  enviarMensaje = async (req, res) => {
    const mensaje = await this.comprasService.enviarMensaje(
      req.validado.params.id,
      req.usuario,
      req.validado.body.mensaje,
    );
    res.status(201).json(mensajeDTO(mensaje, req.usuario));
  };

  reseniar = async (req, res) => {
    const resenia = await this.comprasService.reseniar(
      req.validado.params.id,
      req.usuario,
      req.validado.body,
    );
    res.status(201).json(reseniaDTO(resenia));
  };

  #detalle(compra, req) {
    return compraDetalleDTO(compra, req.usuario, this.reloj);
  }
}

export class UsuariosController {
  constructor(usuariosService, reseniasService, reloj) {
    this.usuariosService = usuariosService;
    this.reseniasService = reseniasService;
    this.reloj = reloj;
  }

  yo = (req, res) => {
    res.json(usuarioDTO(req.usuario));
  };

  favoritos = async (req, res) => {
    const reputaciones = await this.reseniasService.reputaciones();
    res.json(
      req.usuario.favoritos.map((evento) =>
        eventoResumenDTO(evento, reputaciones.get(evento.organizador.id) ?? SIN_RESENIAS, this.reloj),
      ),
    );
  };

  agregarFavorito = async (req, res) => {
    await this.usuariosService.agregarFavorito(req.usuario, req.validado.params.eventoId);
    res.status(204).end();
  };

  quitarFavorito = async (req, res) => {
    await this.usuariosService.quitarFavorito(req.usuario, req.validado.params.eventoId);
    res.status(204).end();
  };
}
