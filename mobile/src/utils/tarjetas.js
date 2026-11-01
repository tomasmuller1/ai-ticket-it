// Ayudas para el formulario de tarjeta. La marca que vale es la que calcula el backend; esta sirve para
// mostrar la tarjeta mientras se escribe.
export function marcaDe(numero) {
  const digitos = soloDigitos(numero);
  if (/^3[47]/.test(digitos)) return "American Express";
  if (/^4/.test(digitos)) return "Visa";
  const seis = Number(digitos.slice(0, 6).padEnd(6, "0"));
  if (/^5[1-5]/.test(digitos) || (digitos.length >= 4 && seis >= 222100 && seis <= 272099))
    return "Mastercard";
  return null;
}

export const soloDigitos = (texto) => texto.replace(/\D/g, "");

// "4111111111111111" → "4111 1111 1111 1111" (American Express: 4-6-5)
export function formatearNumero(texto) {
  const digitos = soloDigitos(texto).slice(0, 19);
  if (marcaDe(digitos) === "American Express") {
    return [digitos.slice(0, 4), digitos.slice(4, 10), digitos.slice(10, 15)].filter(Boolean).join(" ");
  }
  return digitos.replace(/(\d{4})(?=\d)/g, "$1 ");
}

// "1230" → "12/30"
export function formatearVencimiento(texto) {
  const digitos = soloDigitos(texto).slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
}
