import { View } from "react-native";

import { radio, useTema } from "../theme";
import { Texto } from "./ui";

// La marca: un talón de entrada en rojo boletería, con las dos muescas del troquel, y el nombre al lado.
export function Marca({ fondo }) {
  const { colores } = useTema();
  const colorMuesca = fondo ?? colores.fondo;
  return (
    <View
      accessible
      accessibilityLabel="AI Ticket It"
      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      <View
        style={{
          width: 30,
          height: 22,
          borderRadius: radio.sm - 2,
          backgroundColor: colores.marca,
          overflow: "hidden",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: -5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colorMuesca,
          }}
        />
        <View
          style={{
            position: "absolute",
            right: -5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colorMuesca,
          }}
        />
      </View>
      <Texto variante="subtitulo" style={{ letterSpacing: -0.4 }}>
        AI Ticket It
      </Texto>
    </View>
  );
}
