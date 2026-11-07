import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { REQUISITOS_CONTRASENIA } from "../utils/contrasenia";
import { espacio, useTema } from "../theme";
import { Texto } from "./ui";

// Los requisitos siempre a la vista: se tildan a medida que se cumplen y no desaparecen si hay un error.
export function RequisitosContrasenia({ valor }) {
  const { colores } = useTema();
  return (
    <View style={{ gap: espacio.xs }}>
      {REQUISITOS_CONTRASENIA.map(({ texto, cumple }) => {
        const cumplido = cumple(valor);
        return (
          <View
            key={texto}
            accessible
            accessibilityLabel={`${texto}: ${cumplido ? "cumplido" : "falta"}`}
            style={{ flexDirection: "row", alignItems: "center", gap: espacio.xs }}
          >
            <Ionicons
              name={cumplido ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={cumplido ? colores.texto : colores.textoTenue}
            />
            <Texto variante="pequenio" color={cumplido ? "principal" : "secundario"}>
              {texto}
            </Texto>
          </View>
        );
      })}
    </View>
  );
}
