import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { espacio, useTema } from "../theme";
import { Texto } from "./ui";

// Encabezado de una pestaña: título grande y una línea que lo explica. `superior` va arriba del título
// (por ejemplo, la marca en la pantalla de inicio). Se exporta para las pantallas que lo ponen dentro
// de su lista, así se desplaza junto con el contenido.
export function EncabezadoPantalla({ titulo, subtitulo, accion, superior }) {
  return (
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
        {superior && <View style={{ marginBottom: espacio.lg }}>{superior}</View>}
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
  );
}

// Pantalla de una pestaña: respeta el notch y muestra el encabezado fijo arriba del contenido.
export function Pantalla({ titulo, subtitulo, accion, superior, children }) {
  const { colores } = useTema();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colores.fondo }}>
      {titulo && (
        <EncabezadoPantalla titulo={titulo} subtitulo={subtitulo} accion={accion} superior={superior} />
      )}
      {children}
    </SafeAreaView>
  );
}
