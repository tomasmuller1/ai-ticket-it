import { ProhibidoError } from "../errors/index.js";
import { RolUsuario } from "../domain/Usuario.js";

const MENSAJES = {
  [RolUsuario.COMPRADOR]: "Solo una cuenta de comprador puede hacer esto",
  [RolUsuario.ORGANIZADOR]: "Solo una cuenta de organizador puede hacer esto",
};

// Va después de `requiereAutenticacion`: deja pasar solo a las cuentas del rol indicado (403 si no). Cubre
// lo que depende del tipo de cuenta; que la compra o el evento sean de quien pide lo siguen chequeando el
// dominio y los services.
export function soloRol(rol) {
  return (req, res, next) => {
    if (!req.usuario?.tieneRol(rol)) {
      return next(new ProhibidoError(MENSAJES[rol]));
    }
    next();
  };
}

export const soloCompradores = soloRol(RolUsuario.COMPRADOR);
export const soloOrganizadores = soloRol(RolUsuario.ORGANIZADOR);
