// Las mismas reglas que valida el backend: acá sirven para ir mostrando qué falta mientras se escribe.
export const REQUISITOS_CONTRASENIA = [
  { texto: "Al menos 8 caracteres", cumple: (valor) => valor.length >= 8 },
  { texto: "Una letra", cumple: (valor) => /[A-Za-z]/.test(valor) },
  { texto: "Un número", cumple: (valor) => /[0-9]/.test(valor) },
];

export const contraseniaValida = (valor) => REQUISITOS_CONTRASENIA.every(({ cumple }) => cumple(valor));
