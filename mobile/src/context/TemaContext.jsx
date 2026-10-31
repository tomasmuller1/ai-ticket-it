import { useCallback, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { almacenamiento } from "../api/almacenamiento";
import { PREFERENCIAS_TEMA, resolverTema, TemaContext } from "../theme";

// Guarda la preferencia de tema (sistema, claro u oscuro) y la recuerda entre aperturas de la app.
// `listo` avisa cuándo se leyó la preferencia guardada, para no mostrar un tema y cambiarlo enseguida.
export function TemaProvider({ children }) {
  const esquemaDelSistema = useColorScheme();
  const [preferencia, setPreferencia] = useState("sistema");
  const [listo, setListo] = useState(false);

  useEffect(() => {
    almacenamiento
      .obtenerTema()
      .then((guardada) => PREFERENCIAS_TEMA.includes(guardada) && setPreferencia(guardada))
      .catch(() => {})
      .finally(() => setListo(true));
  }, []);

  const elegirTema = useCallback((nueva) => {
    setPreferencia(nueva);
    almacenamiento.guardarTema(nueva).catch(() => {});
  }, []);

  const valor = useMemo(
    () => ({ ...resolverTema(preferencia, esquemaDelSistema), preferencia, elegirTema, listo }),
    [preferencia, esquemaDelSistema, elegirTema, listo],
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}
