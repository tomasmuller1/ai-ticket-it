import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AREA_TACTIL, espacio, radio, useTema } from "../../theme";
import { Texto } from "./Texto";

// Selector de cantidad que no deja salirse de [minimo, maximo] (CU12: no superar el cupo).
export function Stepper({ valor, minimo = 1, maximo, onCambiar, etiqueta = "Cantidad" }) {
  const { colores } = useTema();

  const boton = (icono, delta, deshabilitado, descripcion) => (
    <Pressable
      onPress={() => onCambiar(valor + delta)}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={descripcion}
      accessibilityState={{ disabled: deshabilitado }}
      style={({ pressed }) => ({
        width: AREA_TACTIL,
        height: AREA_TACTIL,
        borderRadius: radio.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? colores.borde : colores.superficie,
        opacity: deshabilitado ? 0.4 : 1,
      })}
    >
      <Ionicons name={icono} size={20} color={colores.texto} />
    </Pressable>
  );

  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: espacio.md }}
      accessibilityLabel={`${etiqueta}: ${valor}`}
    >
      {boton("remove", -1, valor <= minimo, "Restar una")}
      <Texto variante="subtitulo" style={{ minWidth: 28, textAlign: "center" }}>
        {valor}
      </Texto>
      {boton("add", 1, valor >= maximo, "Sumar una")}
    </View>
  );
}
