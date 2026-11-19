import { useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
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

// Opacidad de cada franja del reflejo: sube y baja suave, como un degradé (React Native no tiene degradés y
// no hace falta sumar una dependencia para esto).
const FRANJAS_DEL_REFLEJO = [0.08, 0.2, 0.38, 0.58, 0.75, 0.85, 0.75, 0.58, 0.38, 0.2, 0.08];
const DURACION_REFLEJO_MS = 1300;
const PAUSA_REFLEJO_MS = 250;

// Bloque de carga que reserva el lugar del contenido real, con un reflejo que lo cruza de izquierda a derecha
// (como en LinkedIn). Si la persona activó "Reducir movimiento" en el sistema, el bloque queda quieto.
export function Skeleton({ alto = 16, ancho = "100%", redondeo = radio.sm, style }) {
  const { colores } = useTema();
  const movimientoReducido = useMovimientoReducido();
  const [anchoReal, setAnchoReal] = useState(0);
  const [avance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (movimientoReducido || anchoReal === 0) return undefined;
    avance.setValue(0);
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(avance, {
          toValue: 1,
          duration: DURACION_REFLEJO_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(PAUSA_REFLEJO_MS),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [avance, anchoReal, movimientoReducido]);

  const anchoReflejo = Math.min(Math.max(anchoReal * 0.6, 80), 280);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setAnchoReal(Math.round(e.nativeEvent.layout.width))}
      style={[
        {
          height: alto,
          width: ancho,
          borderRadius: redondeo,
          backgroundColor: colores.esqueleto,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {anchoReal > 0 && !movimientoReducido && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: anchoReflejo,
            flexDirection: "row",
            transform: [
              {
                translateX: avance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-anchoReflejo, anchoReal],
                }),
              },
            ],
          }}
        >
          {FRANJAS_DEL_REFLEJO.map((opacidad, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: colores.esqueletoBrillo, opacity: opacidad }} />
          ))}
        </Animated.View>
      )}
    </View>
  );
}
