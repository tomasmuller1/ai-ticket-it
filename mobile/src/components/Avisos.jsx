import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
import { ALTURA_BARRA, AREA_TACTIL, espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

const AvisosContext = createContext(null);
const MAXIMO_VISIBLES = 3;

const ESTILOS = {
  error: { icono: "alert-circle", color: "peligro" },
  exito: { icono: "checkmark-circle", color: "marca" },
  info: { icono: "information-circle", color: "textoSecundario" },
};

// Un aviso: entra desde abajo, muestra cuánto le queda con una barra que se vacía y se puede cerrar con la
// cruz. Si la persona activó "reducir movimiento", aparece sin desplazarse (la barra sigue contando).
function Aviso({ aviso, onCerrar, movimientoReducido }) {
  const { colores } = useTema();
  const { icono, color } = ESTILOS[aviso.tipo] ?? ESTILOS.info;
  const [entrada] = useState(() => new Animated.Value(movimientoReducido ? 1 : 0));
  const [restante] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const cuenta = Animated.timing(restante, {
      toValue: 0,
      duration: aviso.duracion,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    cuenta.start(({ finished }) => finished && onCerrar(aviso.id));
    return () => cuenta.stop();
  }, [aviso.id, aviso.duracion, entrada, restante, onCerrar]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={{
        opacity: entrada,
        transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        borderRadius: radio.xl,
        backgroundColor: colores.superficieAlta,
        overflow: "hidden",
        shadowColor: colores.sombra,
        shadowOpacity: 0.16,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: espacio.md,
          paddingLeft: espacio.lg,
          paddingVertical: espacio.md,
        }}
      >
        <Ionicons name={icono} size={22} color={colores[color]} style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="cuerpoFuerte">{aviso.titulo}</Texto>
          {aviso.mensaje && (
            <Texto variante="pequenio" color="secundario">
              {aviso.mensaje}
            </Texto>
          )}
        </View>
        <Pressable
          onPress={() => onCerrar(aviso.id)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
          style={({ pressed }) => ({
            width: AREA_TACTIL,
            height: AREA_TACTIL,
            marginTop: -espacio.sm,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Ionicons name="close" size={20} color={colores.textoSecundario} />
        </Pressable>
      </View>
      <View style={{ height: 3, backgroundColor: colores.pista }}>
        <Animated.View
          style={{
            height: 3,
            backgroundColor: colores[color],
            transformOrigin: "left",
            transform: [{ scaleX: restante }],
          }}
        />
      </View>
    </Animated.View>
  );
}

// Avisos temporales (toasts) para contar algo que pasó sin interrumpir: por ejemplo, que en este momento
// no se puede pagar porque la pasarela no responde, mientras el resto de la app sigue funcionando.
export function AvisosProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [avisos, setAvisos] = useState([]);
  const movimientoReducido = useMovimientoReducido();

  const cerrar = useCallback((id) => setAvisos((actuales) => actuales.filter((a) => a.id !== id)), []);

  const avisar = useCallback(({ tipo = "info", titulo, mensaje, duracion = 5000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setAvisos((actuales) => [
      ...actuales.slice(-(MAXIMO_VISIBLES - 1)),
      { id, tipo, titulo, mensaje, duracion },
    ]);
    AccessibilityInfo.announceForAccessibility([titulo, mensaje].filter(Boolean).join(". "));
  }, []);

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: espacio.lg,
          right: espacio.lg,
          bottom: insets.bottom + ALTURA_BARRA + espacio.md,
          gap: espacio.sm,
        }}
      >
        {avisos.map((aviso) => (
          <Aviso key={aviso.id} aviso={aviso} onCerrar={cerrar} movimientoReducido={movimientoReducido} />
        ))}
      </View>
    </AvisosContext.Provider>
  );
}

export function useAvisos() {
  const contexto = useContext(AvisosContext);
  if (!contexto) throw new Error("useAvisos tiene que usarse dentro de AvisosProvider");
  return contexto;
}
