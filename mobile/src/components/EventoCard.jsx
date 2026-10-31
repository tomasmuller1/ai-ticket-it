import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { formato } from "../utils/formato";
import { espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Evento en un listado: la foto manda; abajo el nombre, cuándo y dónde, y el precio a la derecha.
export function EventoCard({ evento, onPress }) {
  const { colores } = useTema();
  const { organizador } = evento;
  const precio = evento.precioDesde === 0 ? "Gratis" : formato.precio(evento.precioDesde);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${evento.nombre}, ${formato.fecha(evento.fecha)}, ${evento.lugar}, desde ${precio}${evento.agotado ? ", agotado" : ""}`}
      style={({ pressed }) => ({ gap: espacio.md, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <View style={{ borderRadius: radio.md, overflow: "hidden", backgroundColor: colores.imagenVacia }}>
        <Image
          source={evento.imagen}
          style={{ width: "100%", aspectRatio: 16 / 10, opacity: evento.agotado ? 0.6 : 1 }}
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
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: espacio.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="subtitulo" numberOfLines={2}>
            {evento.nombre}
          </Texto>
          <Texto variante="pequenio" color="secundario" numberOfLines={1}>
            {formato.dia(evento.fecha)} · {evento.lugar}
          </Texto>
          {organizador.puntaje !== null && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="star" size={12} color={colores.textoSecundario} />
              <Texto variante="pequenio" color="secundario">
                {organizador.puntaje.toFixed(1)} · {organizador.nombre}
              </Texto>
            </View>
          )}
        </View>
        <Texto variante="cuerpoFuerte">{precio}</Texto>
      </View>
    </Pressable>
  );
}
