import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// Si la persona activó "Reducir movimiento" en el sistema: las animaciones de desplazamiento se cambian
// por apariciones simples.
export function useMovimientoReducido() {
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducido);
    const suscripcion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducido);
    return () => suscripcion.remove();
  }, []);
  return reducido;
}
