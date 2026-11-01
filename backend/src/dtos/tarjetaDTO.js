// Lo que se muestra de una tarjeta: nunca el token ni el número completo.
export function tarjetaDTO(tarjeta) {
  return {
    id: tarjeta.id,
    marca: tarjeta.marca,
    ultimos4: tarjeta.ultimos4,
    vencimiento: `${String(tarjeta.vencimientoMes).padStart(2, "0")}/${String(tarjeta.vencimientoAnio).slice(-2)}`,
    titular: tarjeta.titular,
  };
}
