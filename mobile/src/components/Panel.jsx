import { Children, Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AREA_TACTIL, espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Contenedor blanco sobre el fondo (un escalón de tono, sin borde) con filas separadas por una línea fina.
export function Panel({ children, style }) {
  const { colores } = useTema();
  const filas = Children.toArray(children).filter(Boolean);
  return (
    <View
      style={[{ borderRadius: radio.md, backgroundColor: colores.superficieAlta, overflow: "hidden" }, style]}
    >
      {filas.map((fila, i) => (
        <Fragment key={fila.key ?? i}>
          {i > 0 && (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                marginLeft: espacio.lg,
                backgroundColor: colores.borde,
              }}
            />
          )}
          {fila}
        </Fragment>
      ))}
    </View>
  );
}

// Fila tocable de un panel: ícono, título, una línea de detalle opcional y la flecha.
export function FilaPanel({ icono, titulo, detalle, onPress, color }) {
  const { colores } = useTema();
  const tinta = color ? colores[color] : colores.texto;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detalle ? `${titulo}, ${detalle}` : titulo}
      style={({ pressed }) => ({
        minHeight: AREA_TACTIL + 12,
        flexDirection: "row",
        alignItems: "center",
        gap: espacio.md,
        paddingHorizontal: espacio.lg,
        paddingVertical: espacio.md,
        backgroundColor: pressed ? colores.superficie : "transparent",
      })}
    >
      {icono && <Ionicons name={icono} size={22} color={tinta} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="cuerpoFuerte" style={{ color: tinta }}>
          {titulo}
        </Texto>
        {detalle && (
          <Texto variante="pequenio" color="secundario">
            {detalle}
          </Texto>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colores.textoTenue} />
    </Pressable>
  );
}

// Fila de solo lectura: etiqueta a la izquierda y valor a la derecha.
export function DatoPanel({ etiqueta, valor, fuerte = false }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: espacio.md,
        paddingHorizontal: espacio.lg,
        paddingVertical: espacio.md,
      }}
    >
      <Texto color="secundario">{etiqueta}</Texto>
      <Texto variante={fuerte ? "cuerpoFuerte" : "cuerpo"} style={{ flexShrink: 1, textAlign: "right" }}>
        {valor}
      </Texto>
    </View>
  );
}
