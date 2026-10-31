import { Pressable } from "react-native";

import { AREA_TACTIL, espacio, radio, useTema } from "../../theme";
import { Texto } from "./Texto";

export function Chip({ titulo, seleccionado = false, onPress }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      hitSlop={{ top: (AREA_TACTIL - 36) / 2, bottom: (AREA_TACTIL - 36) / 2 }}
      style={({ pressed }) => ({
        minHeight: 36,
        justifyContent: "center",
        paddingHorizontal: espacio.lg,
        borderRadius: radio.pill,
        backgroundColor: seleccionado ? colores.tinta : pressed ? colores.borde : colores.superficie,
      })}
    >
      <Texto variante="etiqueta" style={{ color: seleccionado ? colores.fondo : colores.texto }}>
        {titulo}
      </Texto>
    </Pressable>
  );
}
