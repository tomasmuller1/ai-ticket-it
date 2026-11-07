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
