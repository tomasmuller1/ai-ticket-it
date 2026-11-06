import { useEffect, useRef, useState } from "react";

import { espacio } from "../theme";
import { anunciarEnIOS, enfocarLector } from "../utils/accesibilidad";
import { useMovimientoReducido } from "./useMovimientoReducido";

// Espacio que se deja arriba del campo para que se vea su etiqueta.
const MARGEN = espacio.xxxl * 2;

// Después de un envío con errores lleva el foco del lector de pantalla al primer campo que falló, sin
// mover el foco mientras la persona corrige. Cada campo recibe `ref={refDe("nombre")}`, con la misma clave
// que usa el objeto de errores: los refs se asignan en el orden de la pantalla. Si además se conecta
// `refScroll` al ScrollView, la pantalla se desplaza hasta ese campo.
export function useFocoEnError() {
  const campos = useRef(new Map());
  const refScroll = useRef(null);
  const [errores, setErrores] = useState(null);
  const reducido = useMovimientoReducido();

  useEffect(() => {
    if (!errores) return;
    const mensajes = Object.values(errores).filter(Boolean);
    if (mensajes.length === 0) return;
    anunciarEnIOS(mensajes.length === 1 ? mensajes[0] : `Revisá ${mensajes.length} campos con errores.`);
    const primero = [...campos.current.keys()].find((nombre) => errores[nombre]);
    const nodo = campos.current.get(primero);
    enfocarLector(nodo);
    const scroll = refScroll.current;
    if (nodo && scroll) {
      nodo.measureLayout(
        scroll.getInnerViewRef(),
        (_x, y) => scroll.scrollTo({ y: Math.max(0, y - MARGEN), animated: !reducido }),
        () => {},
      );
    }
    // Solo reacciona a un envío nuevo, no a un cambio de "Reducir movimiento".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errores]);

  const refDe = (nombre) => (nodo) => {
    if (nodo) campos.current.set(nombre, nodo);
    else campos.current.delete(nombre);
  };

  return { refDe, refScroll, enfocarErrores: (encontrados) => setErrores({ ...encontrados }) };
}
