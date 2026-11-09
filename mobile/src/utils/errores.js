import { esReintentable } from "../api/reintentos";

const RECURSOS = {
  evento: { noExiste: "Este evento ya no existe", sinAcceso: "No tenés acceso a este evento" },
  compra: { noExiste: "Esta compra ya no existe", sinAcceso: "No tenés acceso a esta compra" },
};
const GENERICO = { noExiste: "Esto ya no existe", sinAcceso: "No tenés acceso a esto" };

// Qué ve la persona cuando no se pudo cargar una pantalla. Los textos salen de acá según el status: el
// mensaje del backend solo se usa en los 4xx que explican una regla de negocio.
export function describirError(error, recurso) {
  const { noExiste, sinAcceso } = RECURSOS[recurso] ?? GENERICO;
  const reintentable = esReintentable(error);

  if (error?.status === 0) {
    return {
      icono: "cloud-offline-outline",
      titulo: "No pudimos conectarnos",
      mensaje: "Revisá tu conexión e intentá de nuevo.",
      reintentable,
    };
  }
  if (error?.status >= 500) {
    return {
      icono: "construct-outline",
      titulo: "Tuvimos un problema interno",
      mensaje: "No es por algo que hiciste. Probá de nuevo en unos minutos.",
      reintentable,
    };
  }
  if (error?.status === 429) {
    return {
      icono: "hourglass-outline",
      titulo: "Hiciste muchos intentos",
      mensaje: "Probá de nuevo en unos minutos.",
      reintentable,
    };
  }
  if (error?.status === 404) return { icono: "search-outline", titulo: noExiste, reintentable };
  if (error?.status === 403) return { icono: "lock-closed-outline", titulo: sinAcceso, reintentable };
  if (error?.status >= 400) {
    return {
      icono: "alert-circle-outline",
      titulo: "No pudimos cargar esto",
      mensaje: error.message,
      reintentable,
    };
  }
  return {
    icono: "alert-circle-outline",
    titulo: "No pudimos cargar esto",
    mensaje: "Algo salió mal de nuestro lado.",
    reintentable,
  };
}

// Qué ve el organizador cuando falla posponer o cancelar un evento. Los 409 que no son un error suyo se explican
// con una frase propia; el resto usa el mensaje de la API.
export function mensajeDeGestionDeEvento(error, accion) {
  if (error?.codigo === "EVENTO_CANCELADO") {
    return `Este evento ya se canceló: no se puede ${accion === "cancelar" ? "cancelar de nuevo" : "posponer"}.`;
  }
  if (error?.codigo === "OPERACION_EN_CURSO") {
    return accion === "cancelar"
      ? "Todavía estamos cancelando el evento y devolviendo el dinero. Esperá un momento y mirá el estado del evento antes de volver a probar."
      : "Todavía estamos posponiendo el evento. Esperá un momento y mirá el estado del evento antes de volver a probar.";
  }
  return error?.message;
}
