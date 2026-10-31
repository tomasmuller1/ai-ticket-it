import { usuarioDTO } from "../dtos/compraDTO.js";

function sesionDTO(sesion) {
  return {
    accessToken: sesion.accessToken,
    accessTokenExpiraEn: sesion.accessTokenExpiraEn.toISOString(),
    refreshToken: sesion.refreshToken,
    refreshTokenExpiraEn: sesion.refreshTokenExpiraEn.toISOString(),
    usuario: usuarioDTO(sesion.usuario),
  };
}

export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  registrar = async (req, res) => {
    const sesion = await this.authService.registrar(req.validado.body);
    res.status(201).json(sesionDTO(sesion));
  };

  login = async (req, res) => {
    res.json(sesionDTO(await this.authService.login(req.validado.body)));
  };

  refrescar = async (req, res) => {
    res.json(sesionDTO(await this.authService.refrescar(req.validado.body.refreshToken)));
  };

  loginConGoogle = async (req, res) => {
    res.json(sesionDTO(await this.authService.loginConGoogle(req.validado.body.idToken)));
  };

  cambiarContrasenia = async (req, res) => {
    res.json(sesionDTO(await this.authService.cambiarContrasenia(req.usuario, req.validado.body)));
  };

  cerrarSesion = async (req, res) => {
    await this.authService.cerrarSesion(req.validado.body.refreshToken);
    res.status(204).end();
  };
}
