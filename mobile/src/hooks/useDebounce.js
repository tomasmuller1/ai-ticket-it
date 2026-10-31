import { useEffect, useState } from "react";

// Devuelve el valor recién cuando dejó de cambiar por `ms` (evita una request por cada tecla).
export function useDebounce(valor, ms = 350) {
  const [demorado, setDemorado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDemorado(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return demorado;
}
