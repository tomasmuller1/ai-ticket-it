import { ActivityIndicator, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AREA_TACTIL, espacio, radio, useTema } from "../../theme";
import { Texto } from "./Texto";

// variante: "primario" (la acción principal de la pantalla, una sola), "secundario", "fantasma",
// "peligro" o "peligroSutil" (acción destructiva poco frecuente, sin borde).
export function Boton({
  titulo,
  onPress,
  variante = "primario",
  icono,
  cargando = false,
  deshabilitado,
  style,
}) {
  const { colores } = useTema();
  const inactivo = deshabilitado || cargando;

  const paleta = {
    primario: {
      fondo: colores.acento,
      presionado: colores.acentoPresionado,
      texto: colores.sobreAcento,
      borde: null,
    },
    // Un escalón de tono, sin borde: se distingue de la primaria por el relleno, no por una línea.
    secundario: {
      fondo: colores.superficie,
      presionado: colores.bordeFuerte,
      texto: colores.texto,
      borde: null,
    },
    fantasma: {
      fondo: "transparent",
      presionado: colores.superficie,
      texto: colores.textoAcento,
      borde: null,
    },
    peligroSutil: {
      fondo: "transparent",
      presionado: colores.peligroSuave,
      texto: colores.peligro,
      borde: null,
    },
    peligro: {
      fondo: colores.fondo,
      presionado: colores.peligroSuave,
      texto: colores.peligro,
      borde: colores.peligro,
    },
  }[variante];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        {
          minHeight: AREA_TACTIL + 8,
          borderRadius: radio.pill,
          paddingHorizontal: espacio.xl,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? paleta.presionado : paleta.fondo,
          borderWidth: paleta.borde ? 1 : 0,
          borderColor: paleta.borde ?? "transparent",
          opacity: deshabilitado ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={paleta.texto} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.sm }}>
          {icono && <Ionicons name={icono} size={18} color={paleta.texto} />}
          <Texto variante="cuerpoFuerte" style={{ color: paleta.texto }}>
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}
