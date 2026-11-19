// Tipo de cuenta, el mismo `rol` que devuelve la API en el usuario. Se elige al registrarse y no se cambia:
// define qué pestañas y qué acciones ve la persona.
export const ROLES = Object.freeze({ COMPRADOR: "COMPRADOR", ORGANIZADOR: "ORGANIZADOR" });

export const NOMBRE_ROL = {
  [ROLES.COMPRADOR]: "Comprador",
  [ROLES.ORGANIZADOR]: "Organizador",
};

export const esOrganizador = (usuario) => usuario?.rol === ROLES.ORGANIZADOR;
export const esComprador = (usuario) => usuario?.rol === ROLES.COMPRADOR;
