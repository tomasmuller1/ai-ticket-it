import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { formato } from "../utils/formato";
import { espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Tarjeta de evento para listados: imagen con la fecha "de entrada", categoría, nombre, lugar y precio.
export function EventoCard({ evento, onPress }) {
  const { colores } = useTema();
  const { organizador } = evento;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${evento.nombre}, ${formato.fecha(evento.fecha)}, ${evento.lugar}, desde ${formato.precio(evento.precioDesde)}`}
      style={({ pressed }) => ({ gap: espacio.sm, opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ borderRadius: radio.lg, overflow: "hidden", backgroundColor: colores.imagenVacia }}>
        <Image
          source={evento.imagen}
          style={{ width: "100%", aspectRatio: 16 / 9 }}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
        <View
          style={{
            position: "absolute",
            top: espacio.md,
            left: espacio.md,
            backgroundColor: colores.fondo,
            borderRadius: radio.md,
            paddingHorizontal: espacio.sm + 2,
            paddingVertical: espacio.xs,
            alignItems: "center",
          }}
        >
          <Texto variante="subtitulo" style={{ lineHeight: 20 }}>
            {formato.dia(evento.fecha)}
          </Texto>
          <Texto variante="overline" color="acento" style={{ fontSize: 10, lineHeight: 12 }}>
            {formato.mes(evento.fecha)}
          </Texto>
        </View>
        {evento.agotado && (
          <View
            style={{
              position: "absolute",
              top: espacio.md,
              right: espacio.md,
              backgroundColor: colores.tinta,
              borderRadius: radio.pill,
              paddingHorizontal: espacio.md,
              paddingVertical: espacio.xs,
            }}
          >
            <Texto variante="etiqueta" style={{ color: colores.fondo }}>
              Agotado
            </Texto>
          </View>
        )}
      </View>
      <View style={{ gap: 2 }}>
        <Texto variante="overline" color="acento">
          {evento.categoria.nombre}
        </Texto>
        <Texto variante="subtitulo" numberOfLines={2}>
          {evento.nombre}
        </Texto>
        <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.xs, flexWrap: "wrap" }}>
          <Ionicons name="location-outline" size={14} color={colores.textoSecundario} />
          <Texto variante="pequenio" color="secundario" numberOfLines={1} style={{ flexShrink: 1 }}>
            {evento.lugar}
          </Texto>
          {organizador.puntaje !== null && (
            <>
              <Texto variante="pequenio" color="tenue">
                ·
              </Texto>
              <Ionicons name="star" size={13} color={colores.aviso} />
              <Texto variante="pequenio" color="secundario">
                {organizador.puntaje.toFixed(1)}
              </Texto>
            </>
          )}
        </View>
        <Texto variante="cuerpoFuerte" style={{ marginTop: 2 }}>
          {evento.precioDesde === 0 ? "Gratis" : `Desde ${formato.precio(evento.precioDesde)}`}
        </Texto>
      </View>
    </Pressable>
  );
}
