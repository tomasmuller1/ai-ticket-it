import { useEffect, useRef, useState } from "react";

import { anunciarEnIOS, enfocarLector } from "../utils/accesibilidad";

// Después de un envío con errores lleva el foco del lector de pantalla al primer campo que falló, sin
// mover el foco mientras la persona corrige. Cada campo recibe `ref={refDe("nombre")}`, con la misma clave
// que usa el objeto de errores: los refs se asignan en el orden de la pantalla.
export function useFocoEnError() {
  const campos = useRef(new Map());
  const [errores, setErrores] = useState(null);

  useEffect(() => {
    if (!errores) return;
    const mensajes = Object.values(errores).filter(Boolean);
    if (mensajes.length === 0) return;
    anunciarEnIOS(mensajes.length === 1 ? mensajes[0] : `Revisá ${mensajes.length} campos con errores.`);
    const primero = [...campos.current.keys()].find((nombre) => errores[nombre]);
    enfocarLector(campos.current.get(primero));
  }, [errores]);

  const refDe = (nombre) => (nodo) => {
    if (nodo) campos.current.set(nombre, nodo);
    else campos.current.delete(nombre);
  };

  return { refDe, enfocarErrores: (encontrados) => setErrores({ ...encontrados }) };
}
