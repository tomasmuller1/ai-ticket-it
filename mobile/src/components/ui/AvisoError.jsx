import { Children, useEffect } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { anunciarEnIOS } from "../../utils/accesibilidad";
import { espacio, radio, useTema } from "../../theme";
import { Texto } from "./Texto";

// Aviso de error dentro de una pantalla (por ejemplo, la respuesta de la API a un formulario).
export function AvisoError({ children }) {
  const { colores } = useTema();
  const texto = children ? Children.toArray(children).join("") : null;

  useEffect(() => anunciarEnIOS(texto), [texto]);

  if (!children) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: espacio.sm,
        alignItems: "flex-start",
        backgroundColor: colores.peligroSuave,
        borderRadius: radio.md,
        padding: espacio.md,
      }}
    >
      <Ionicons name="alert-circle" size={20} color={colores.peligro} />
      <Texto color="peligro" accessibilityLiveRegion="polite" style={{ flex: 1 }}>
        {children}
      </Texto>
    </View>
  );
}
