import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AREA_TACTIL, radio, useTema } from "../theme";

// Botón redondo sobre una imagen (volver, favorito). Fondo sólido para que se lea sobre cualquier foto.
export function BotonFlotante({ icono, onPress, etiqueta, color, seleccionado }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={seleccionado === undefined ? undefined : { selected: seleccionado }}
      style={({ pressed }) => ({
        width: AREA_TACTIL,
        height: AREA_TACTIL,
        borderRadius: radio.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colores.fondo,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Ionicons name={icono} size={22} color={color ?? colores.texto} />
    </Pressable>
  );
}
