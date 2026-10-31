import { useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { espacio, radio, useTema } from "../../theme";
import { Boton } from "./Boton";
import { Texto } from "./Texto";

function Centro({ children }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: espacio.xxl,
        gap: espacio.md,
      }}
    >
      {children}
    </View>
  );
}

export function Cargando() {
  const { colores } = useTema();
  return (
    <Centro>
      <ActivityIndicator size="large" color={colores.acento} accessibilityLabel="Cargando" />
    </Centro>
  );
}

// Un estado vacío invita a hacer algo, no pide disculpas.
export function EstadoVacio({ icono = "sparkles-outline", titulo, descripcion, accion }) {
  const { colores } = useTema();
  return (
    <Centro>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radio.pill,
          backgroundColor: colores.acentoSuave,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icono} size={32} color={colores.textoAcento} />
      </View>
      <Texto variante="subtitulo" style={{ textAlign: "center" }}>
        {titulo}
      </Texto>
      {descripcion && (
        <Texto color="secundario" style={{ textAlign: "center" }}>
          {descripcion}
        </Texto>
      )}
      {accion && <Boton titulo={accion.titulo} onPress={accion.onPress} style={{ marginTop: espacio.sm }} />}
    </Centro>
  );
}

export function EstadoError({ error, onReintentar }) {
  return (
    <EstadoVacio
      icono="cloud-offline-outline"
      titulo="No pudimos cargar esto"
      descripcion={error?.message ?? "No pudimos cargar la información."}
      accion={onReintentar && { titulo: "Reintentar", onPress: onReintentar }}
    />
  );
}

// Bloque gris que "respira" mientras carga el contenido real (reserva su espacio).
export function Skeleton({ alto = 16, ancho = "100%", redondeo = radio.sm, style }) {
  const { colores } = useTema();
  const [opacidad] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    let animacion;
    let cancelado = false;
    // Si la persona activó "Reducir movimiento" en el sistema, el bloque queda quieto.
    AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      if (cancelado || reducir) return;
      animacion = Animated.loop(
        Animated.sequence([
          Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacidad, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        ]),
      );
      animacion.start();
    });
    return () => {
      cancelado = true;
      animacion?.stop();
    };
  }, [opacidad]);

  return (
    <Animated.View
      style={[
        {
          height: alto,
          width: ancho,
          borderRadius: redondeo,
          backgroundColor: colores.superficie,
          opacity: opacidad,
        },
        style,
      ]}
    />
  );
}
