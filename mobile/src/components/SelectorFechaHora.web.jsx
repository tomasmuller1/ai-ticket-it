import { createElement } from "react";
import { View } from "react-native";

import { AREA_TACTIL, espacio, fuentes, radio, useTema } from "../theme";
import { Texto } from "./ui";

// "2026-12-10T21:00" en hora local, el formato que usa <input type="datetime-local">.
function aLocal(fecha) {
  const desfase = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}

// En web el datetimepicker nativo no existe: se usa el selector del navegador.
export function SelectorFechaHora({ etiqueta, valor, minimo, onCambiar, error }) {
  const { colores } = useTema();
  return (
    <View style={{ gap: espacio.xs }}>
      <Texto variante="etiqueta">{etiqueta}</Texto>
      {createElement("input", {
        type: "datetime-local",
        "aria-label": etiqueta,
        value: aLocal(valor),
        min: minimo ? aLocal(minimo) : undefined,
        onChange: (evento) => evento.target.value && onCambiar(new Date(evento.target.value)),
        style: {
          minHeight: AREA_TACTIL + 4,
          padding: `0 ${espacio.md}px`,
          borderRadius: radio.md,
          border: `${error ? 2 : 1}px solid ${error ? colores.peligro : colores.bordeCampo}`,
          backgroundColor: colores.superficie,
          color: colores.texto,
          fontFamily: fuentes.regular,
          fontSize: 16,
        },
      })}
      {error && (
        <Texto variante="pequenio" color="peligro">
          {error}
        </Texto>
      )}
    </View>
  );
}
