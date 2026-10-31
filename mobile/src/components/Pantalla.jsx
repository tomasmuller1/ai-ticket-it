import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { espacio, useTema } from "../theme";
import { Texto } from "./ui";

// Pantalla de una pestaña: respeta el notch y muestra un encabezado grande.
export function Pantalla({ titulo, antetitulo, accion, children }) {
  const { colores } = useTema();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colores.fondo }}>
      {titulo && (
        <View
          style={{
            paddingHorizontal: espacio.lg,
            paddingTop: espacio.md,
            paddingBottom: espacio.sm,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            {antetitulo && <Texto color="secundario">{antetitulo}</Texto>}
            <Texto variante="titulo" accessibilityRole="header">
              {titulo}
            </Texto>
          </View>
          {accion}
        </View>
      )}
      {children}
    </SafeAreaView>
  );
}
