import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { formato } from "../utils/formato";
import { espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Evento en un listado, como un afiche: la foto manda, el nombre en letra de afiche y abajo cuándo,
// dónde y quién organiza. El precio queda a la altura del nombre.
export function EventoCard({ evento, onPress }) {
  const { colores } = useTema();
  const { organizador } = evento;
  const precio = evento.precioDesde === 0 ? "Gratis" : formato.precio(evento.precioDesde);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${evento.nombre}. ${formato.fecha(evento.fecha)}, ${evento.lugar}. Desde ${precio}${evento.agotado ? ". Agotado" : ""}`}
      style={({ pressed }) => ({ gap: espacio.md, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <View style={{ borderRadius: radio.md, overflow: "hidden", backgroundColor: colores.imagenVacia }}>
        <Image
          source={evento.imagen}
          style={{ width: "100%", aspectRatio: 16 / 10, opacity: evento.agotado ? 0.55 : 1 }}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
        {evento.agotado && (
          <View
            style={{
              position: "absolute",
              top: espacio.md,
              left: espacio.md,
              backgroundColor: colores.superficieAlta,
              borderRadius: radio.pill,
              paddingHorizontal: espacio.md,
              paddingVertical: espacio.xs,
            }}
          >
            <Texto variante="etiqueta">Agotado</Texto>
          </View>
        )}
      </View>
      <View style={{ gap: espacio.xs }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: espacio.md }}>
          <Texto variante="titulo" numberOfLines={2} style={{ flex: 1, fontSize: 28, lineHeight: 30 }}>
            {evento.nombre}
          </Texto>
          <Texto variante="cuerpoFuerte" style={{ marginTop: 3 }}>
            {precio}
          </Texto>
        </View>
        <View>
          <Texto variante="etiqueta">{formato.fecha(evento.fecha)}</Texto>
          <Texto variante="pequenio" color="secundario" numberOfLines={1}>
            {evento.lugar}
          </Texto>
        </View>
        {organizador.puntaje !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Texto variante="pequenio" color="secundario" numberOfLines={1} style={{ flexShrink: 1 }}>
              Organiza {organizador.nombre}
            </Texto>
            <Ionicons name="star" size={12} color={colores.textoSecundario} style={{ marginLeft: 4 }} />
            <Texto variante="pequenio" color="secundario">
              {formato.puntaje(organizador.puntaje)}
            </Texto>
          </View>
        )}
      </View>
    </Pressable>
  );
}
