import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { espacio, radio, useTema } from "../../theme";
import { Texto } from "./Texto";

// Estado de una compra con color, ícono y texto: se entiende aunque no se distingan los colores.
export function BadgeEstado({ estado }) {
  const { estados } = useTema();
  const { etiqueta, icono, fondo, texto } = estados[estado];
  return (
    <View
      accessibilityLabel={`Estado: ${etiqueta}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: espacio.xs,
        paddingHorizontal: espacio.sm + 2,
        paddingVertical: espacio.xs,
        borderRadius: radio.pill,
        backgroundColor: fondo,
      }}
    >
      <Ionicons name={icono} size={14} color={texto} />
      <Texto variante="etiqueta" style={{ color: texto, fontSize: 13 }}>
        {etiqueta}
      </Texto>
    </View>
  );
}
