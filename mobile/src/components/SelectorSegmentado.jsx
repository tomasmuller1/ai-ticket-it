import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AREA_TACTIL, espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Control segmentado: una sola opción elegida entre pocas (por ejemplo, el tema de la app).
// opciones: [{ valor, etiqueta, icono? }]
export function SelectorSegmentado({ etiqueta, opciones, valor, onCambiar }) {
  const { colores } = useTema();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={etiqueta}
      style={{
        flexDirection: "row",
        padding: espacio.xs,
        gap: espacio.xs,
        borderRadius: radio.pill,
        backgroundColor: colores.superficie,
      }}
    >
      {opciones.map((opcion) => {
        const elegida = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            onPress={() => onCambiar(opcion.valor)}
            accessibilityRole="radio"
            accessibilityLabel={opcion.etiqueta}
            accessibilityState={{ checked: elegida }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: AREA_TACTIL,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: espacio.xs,
              borderRadius: radio.pill,
              backgroundColor: elegida ? colores.superficieAlta : "transparent",
              opacity: pressed && !elegida ? 0.6 : 1,
            })}
          >
            {opcion.icono && (
              <Ionicons
                name={opcion.icono}
                size={16}
                color={elegida ? colores.texto : colores.textoSecundario}
              />
            )}
            <Texto variante="etiqueta" style={{ color: elegida ? colores.texto : colores.textoSecundario }}>
              {opcion.etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
