import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { espacio, radio, useTema } from "../../theme";
import { Texto } from "./Texto";

// Recuadro informativo dentro de una pantalla: un ícono de color y el mensaje. `color` es un token de `colores`
// (por ejemplo "aviso" o "peligro"). Se anuncia solo (región viva) cuando aparece o cambia.
export function Aviso({ icono, color = "aviso", children }) {
  const { colores } = useTema();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        gap: espacio.md,
        padding: espacio.lg,
        borderRadius: radio.md,
        backgroundColor: colores.superficieAlta,
      }}
    >
      <Ionicons name={icono} size={22} color={colores[color]} />
      <Texto style={{ flex: 1 }}>{children}</Texto>
    </View>
  );
}
