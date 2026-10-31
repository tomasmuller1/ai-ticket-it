import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { espacio, useTema } from "../theme";
import { Texto } from "./ui";

// Pantalla de una pestaña: respeta el notch y muestra el título grande con una línea que lo explica.
export function Pantalla({ titulo, subtitulo, accion, children }) {
  const { colores } = useTema();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colores.fondo }}>
      {titulo && (
        <View
          style={{
            paddingHorizontal: espacio.lg,
            paddingTop: espacio.lg,
            paddingBottom: espacio.md,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: espacio.md,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="display" accessibilityRole="header">
              {titulo}
            </Texto>
            {subtitulo && (
              <Texto variante="pequenio" color="secundario" accessibilityLiveRegion="polite">
                {subtitulo}
              </Texto>
            )}
          </View>
          {accion}
        </View>
      )}
      {children}
    </SafeAreaView>
  );
}
