import { useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { describirError } from "../../utils/errores";
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

// Espera antes de anunciar la carga: si los datos llegan enseguida, el lector no dice nada de más.
const DEMORA_ANUNCIO_MS = 500;

// Envuelve lo que se ve mientras carga (bloques de un skeleton o un spinner): para el lector de pantalla es
// un solo elemento con nombre, y si tarda se anuncia.
export function BloqueCargando({ etiqueta = "Cargando", style, children }) {
  useEffect(() => {
    const id = setTimeout(() => AccessibilityInfo.announceForAccessibility(etiqueta), DEMORA_ANUNCIO_MS);
    return () => clearTimeout(id);
  }, [etiqueta]);

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={etiqueta} style={style}>
      {children}
    </View>
  );
}

export function Cargando({ etiqueta }) {
  const { colores } = useTema();
  return (
    <Centro>
      <BloqueCargando etiqueta={etiqueta}>
        <ActivityIndicator size="large" color={colores.acento} />
      </BloqueCargando>
    </Centro>
  );
}

// Un estado vacío invita a hacer algo, no pide disculpas.
export function EstadoVacio({ icono = "sparkles-outline", titulo, descripcion, accion, secundaria }) {
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
      {accion && (
        <Boton
          titulo={accion.titulo}
          onPress={accion.onPress}
          cargando={accion.cargando}
          style={{ marginTop: espacio.sm }}
        />
      )}
      {secundaria && <Boton titulo={secundaria.titulo} onPress={secundaria.onPress} variante="fantasma" />}
    </Centro>
  );
}

// Decide qué mostrar según el error: solo ofrece Reintentar si repetir puede cambiar el resultado, aunque
// la pantalla le pase `onReintentar`. `recurso` ("evento" o "compra") ajusta el texto de 403 y 404.
// `onVolver` es para pantallas a las que se puede llegar con un enlace, sin nada detrás a donde volver.
export function EstadoError({ error, onReintentar, recurso, onVolver }) {
  const { icono, titulo, mensaje, reintentable } = describirError(error, recurso);
  const [reintentando, setReintentando] = useState(false);

  async function reintentar() {
    setReintentando(true);
    try {
      await onReintentar();
    } finally {
      setReintentando(false);
    }
  }

  return (
    <EstadoVacio
      icono={icono}
      titulo={titulo}
      descripcion={mensaje}
      accion={
        reintentable && onReintentar && { titulo: "Reintentar", onPress: reintentar, cargando: reintentando }
      }
      secundaria={onVolver && { titulo: "Volver", onPress: onVolver }}
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
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          height: alto,
          width: ancho,
          borderRadius: redondeo,
          backgroundColor: colores.esqueleto,
          opacity: opacidad,
        },
        style,
      ]}
    />
  );
}
