import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { etiquetaEstadoEvento } from "../utils/estados";
import { espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

const ICONOS = { POSPUESTO: "calendar-outline", CANCELADO: "close-circle-outline" };

// "Nueva fecha" o "Cancelado" para un evento que no sigue su curso normal; no dibuja nada si está programado, ni
// "Nueva fecha" si ya se realizó (`finalizado`). Lleva ícono y texto, no solo color, y fondo propio: se puede poner
// sobre una foto (con `style` se la posiciona).
export function InsigniaEvento({ estado, finalizado, style }) {
  const { colores } = useTema();
  const etiqueta = etiquetaEstadoEvento(estado, { finalizado });
  if (!etiqueta) return null;
  const tinta = colores[etiqueta.color];
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: espacio.xs,
          paddingHorizontal: espacio.md,
          paddingVertical: espacio.xs,
          borderRadius: radio.pill,
          backgroundColor: colores.superficieAlta,
        },
        style,
      ]}
    >
      <Ionicons name={ICONOS[estado]} size={14} color={tinta} />
      <Texto variante="etiqueta" style={{ color: tinta }}>
        {etiqueta.texto}
      </Texto>
    </View>
  );
}
