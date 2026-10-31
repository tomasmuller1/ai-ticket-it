import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AREA_TACTIL, useTema } from "../../theme";

const PUNTOS = [1, 2, 3, 4, 5];

// Solo lectura si no recibe onCambiar; editable (CU9) si lo recibe.
export function Estrellas({ valor = 0, tamanio = 16, onCambiar }) {
  const { colores } = useTema();
  const editable = Boolean(onCambiar);

  if (!editable) {
    return (
      <View style={{ flexDirection: "row", gap: 2 }} accessibilityLabel={`${valor} de 5 estrellas`}>
        {PUNTOS.map((punto) => (
          <Ionicons
            key={punto}
            name={valor >= punto ? "star" : valor >= punto - 0.5 ? "star-half" : "star-outline"}
            size={tamanio}
            color={colores.aviso}
          />
        ))}
      </View>
    );
  }

  return (
    <View
      style={{ flexDirection: "row" }}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 1, max: 5, now: valor }}
    >
      {PUNTOS.map((punto) => (
        <Pressable
          key={punto}
          onPress={() => onCambiar(punto)}
          accessibilityRole="button"
          accessibilityLabel={`${punto} ${punto === 1 ? "estrella" : "estrellas"}`}
          style={{
            width: AREA_TACTIL + 4,
            height: AREA_TACTIL + 4,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={valor >= punto ? "star" : "star-outline"} size={tamanio} color={colores.aviso} />
        </Pressable>
      ))}
    </View>
  );
}
