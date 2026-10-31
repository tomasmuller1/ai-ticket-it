// Pasa a minúsculas y saca los acentos: "Música" y "musica" se consideran iguales al buscar.
export function normalizar(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
