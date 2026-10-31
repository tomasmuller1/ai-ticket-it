import { NoAutenticadoError } from "../errors/index.js";

// El autenticador es intercambiable (hoy AutenticadorJwt): las rutas solo dependen de este
// middleware y de req.usuario.
export function requiereAutenticacion(autenticador) {
  return async (req, res, next) => {
    const usuario = await autenticador.autenticar(req);
    if (!usuario) {
      return next(new NoAutenticadoError());
    }
    req.usuario = usuario;
    next();
  };
}
