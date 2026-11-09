import { useRef } from "react";
import * as Crypto from "expo-crypto";

// La clave de idempotencia identifica la intención (los datos que se mandan) y se repite si se vuelve a intentar con
// los mismos: si el pedido anterior llegó al servidor y se perdió la respuesta, la API devuelve esa respuesta en lugar
// de repetir la operación. Si los datos cambian es otra intención y lleva otra clave.
export function useClavePorIntencion() {
  const intencion = useRef(null);
  return (datos) => {
    const huella = JSON.stringify(datos);
    if (intencion.current?.huella !== huella) intencion.current = { huella, clave: Crypto.randomUUID() };
    return intencion.current.clave;
  };
}
