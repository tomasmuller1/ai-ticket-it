import { useEffect, useState } from "react";
import { Keyboard, LayoutAnimation, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
import { ALTURA_BARRA, espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Espacio que deja abajo una lista de una pestaña. La barra ocupa su propio lugar (no tapa contenido),
// así que alcanza con el margen normal; se mantiene como hook por si la barra vuelve a flotar.
export function useEspacioBarra() {
  return espacio.xl;
}

function useTecladoVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const mostrar = Keyboard.addListener("keyboardDidShow", () => setVisible(true));
    const ocultar = Keyboard.addListener("keyboardDidHide", () => setVisible(false));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);
  return visible;
}

// Barra de pestañas pegada abajo, de borde a borde: solo íconos y la pestaña activa en una píldora de
// tinta con su nombre y el ícono en el verde de la marca. Se usa como `tabBar` de las Tabs de Expo Router,
// que en SDK 58 le pasa `emitter` y `navigateToTab` (no el `navigation` de React Navigation).
export function BarraNavegacion({ state, descriptors, emitter, navigateToTab }) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const tecladoVisible = useTecladoVisible();
  const movimientoReducido = useMovimientoReducido();

  // En Android el teclado empuja la barra hacia arriba: se oculta mientras se escribe.
  if (tecladoVisible && Platform.OS === "android") return null;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        backgroundColor: colores.barra,
        borderTopLeftRadius: radio.xl + espacio.sm,
        borderTopRightRadius: radio.xl + espacio.sm,
        paddingTop: espacio.sm,
        paddingBottom: Math.max(insets.bottom - espacio.sm, espacio.sm),
        paddingHorizontal: espacio.md,
      }}
    >
      <View
        style={{
          height: ALTURA_BARRA - espacio.sm,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {state.routes.map((ruta, indice) => {
          const { options } = descriptors[ruta.key];
          const activa = state.index === indice;

          function alPresionar() {
            const evento = emitter.emit({ type: "tabPress", target: ruta.key, canPreventDefault: true });
            if (activa || evento.defaultPrevented) return;
            if (!movimientoReducido) {
              LayoutAnimation.configureNext(LayoutAnimation.create(180, "easeInEaseOut", "opacity"));
            }
            if (Platform.OS !== "web") Haptics.selectionAsync();
            navigateToTab(ruta.key);
          }

          return (
            <Pressable
              key={ruta.key}
              onPress={alPresionar}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: ruta.key })}
              accessibilityRole="tab"
              accessibilityLabel={options.title}
              accessibilityState={{ selected: activa }}
              style={({ pressed }) => ({
                height: 44,
                minWidth: 48,
                flexShrink: activa ? 1 : 0,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingHorizontal: activa ? espacio.lg : 0,
                borderRadius: radio.pill,
                backgroundColor: activa ? colores.barraActiva : "transparent",
                opacity: pressed && !activa ? 0.55 : 1,
              })}
            >
              <Ionicons
                name={activa ? options.icono : `${options.icono}-outline`}
                size={activa ? 20 : 23}
                color={activa ? colores.iconoBarraActiva : colores.barraIcono}
              />
              {activa && (
                <Texto
                  variante="etiqueta"
                  numberOfLines={1}
                  style={{ color: colores.sobreBarraActiva, fontSize: 14, flexShrink: 1 }}
                >
                  {options.title}
                </Texto>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
