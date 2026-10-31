import { useEffect, useState } from "react";
import { AccessibilityInfo, Keyboard, LayoutAnimation, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { ALTURA_BARRA, espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Espacio que tiene que dejar abajo el contenido de una pestaña para no quedar tapado por la barra.
export function useEspacioBarra() {
  const insets = useSafeAreaInsets();
  return ALTURA_BARRA + Math.max(insets.bottom, espacio.md) + espacio.lg;
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

function useMovimientoReducido() {
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducido);
    const suscripcion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducido);
    return () => suscripcion.remove();
  }, []);
  return reducido;
}

// Barra de pestañas flotante: solo íconos, y la pestaña activa en una píldora con su nombre.
// Se usa como `tabBar` de las Tabs de Expo Router (recibe state, descriptors y navigation).
export function BarraNavegacion({ state, descriptors, navigation }) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const tecladoVisible = useTecladoVisible();
  const movimientoReducido = useMovimientoReducido();

  if (tecladoVisible) return null;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: "absolute",
        left: espacio.lg,
        right: espacio.lg,
        bottom: Math.max(insets.bottom, espacio.md),
        height: ALTURA_BARRA,
        borderRadius: radio.pill,
        backgroundColor: colores.barra,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: espacio.sm,
      }}
    >
      {state.routes.map((ruta, indice) => {
        const { options } = descriptors[ruta.key];
        const activa = state.index === indice;

        function alPresionar() {
          const evento = navigation.emit({ type: "tabPress", target: ruta.key, canPreventDefault: true });
          if (activa || evento.defaultPrevented) return;
          if (!movimientoReducido) {
            LayoutAnimation.configureNext(LayoutAnimation.create(180, "easeInEaseOut", "opacity"));
          }
          if (Platform.OS !== "web") Haptics.selectionAsync();
          navigation.navigate(ruta.name, ruta.params);
        }

        return (
          <Pressable
            key={ruta.key}
            onPress={alPresionar}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: ruta.key })}
            accessibilityRole="tab"
            accessibilityLabel={options.title}
            accessibilityState={{ selected: activa }}
            style={({ pressed }) => ({
              height: 48,
              minWidth: 44,
              flexShrink: activa ? 1 : 0,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingHorizontal: activa ? espacio.lg : 0,
              borderRadius: radio.pill,
              backgroundColor: activa ? colores.barraActiva : "transparent",
              opacity: pressed && !activa ? 0.6 : 1,
            })}
          >
            <Ionicons
              name={activa ? options.icono : `${options.icono}-outline`}
              size={activa ? 20 : 22}
              color={activa ? colores.sobreBarraActiva : colores.barraIcono}
            />
            {activa && (
              <Texto
                variante="etiqueta"
                numberOfLines={1}
                style={{ color: colores.sobreBarraActiva, fontSize: 13, flexShrink: 1 }}
              >
                {options.title}
              </Texto>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
