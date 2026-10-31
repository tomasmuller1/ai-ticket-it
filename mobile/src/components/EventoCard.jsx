import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { formato } from "../utils/formato";
import { espacio, fuentes, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Fecha sobre la foto, como en un afiche: el día grande y el mes abajo.
function FechaEnFoto({ fecha }) {
  const { colores } = useTema();
  return (
    <View
      style={{
        position: "absolute",
        top: espacio.md,
        left: espacio.md,
        minWidth: 48,
        alignItems: "center",
        paddingHorizontal: espacio.sm,
        paddingTop: espacio.xs,
        paddingBottom: espacio.xs + 2,
        borderRadius: radio.xl,
        backgroundColor: colores.superficieAlta,
      }}
    >
      <Texto variante="titulo" style={{ fontSize: 26, lineHeight: 28 }}>
        {formato.diaDelMes(fecha)}
      </Texto>
      <Texto style={{ fontFamily: fuentes.negrita, fontSize: 11, lineHeight: 13, letterSpacing: 0.8 }}>
        {formato.mes(fecha).toUpperCase()}
      </Texto>
    </View>
  );
}

// Evento en un listado: la foto con la fecha, la categoría, el nombre en letra de afiche y el precio
// destacado a la derecha; abajo dónde es y quién organiza.
export function EventoCard({ evento, onPress }) {
  const { colores } = useTema();
  const { organizador } = evento;
  const gratis = evento.precioDesde === 0;
  const precio = gratis ? "Gratis" : formato.precio(evento.precioDesde);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${evento.nombre}. ${evento.categoria.nombre}. ${formato.fecha(evento.fecha)}, ${evento.lugar}. ${gratis ? "Gratis" : `Desde ${precio}`}${evento.agotado ? ". Agotado" : ""}`}
      style={({ pressed }) => ({ gap: espacio.md, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <View style={{ borderRadius: radio.foto, overflow: "hidden", backgroundColor: colores.imagenVacia }}>
        <Image
          source={evento.imagen}
          style={{ width: "100%", aspectRatio: 16 / 9, opacity: evento.agotado ? 0.55 : 1 }}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
        <FechaEnFoto fecha={evento.fecha} />
        {evento.agotado && (
          <View
            style={{
              position: "absolute",
              top: espacio.md,
              right: espacio.md,
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
          <Texto
            style={{ fontFamily: fuentes.negrita, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 }}
            numberOfLines={1}
          >
            {evento.categoria.nombre.toUpperCase()}
          </Texto>
          <Texto variante="titulo" numberOfLines={2} style={{ fontSize: 26, lineHeight: 28 }}>
            {evento.nombre}
          </Texto>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {!gratis && (
            <Texto variante="pequenio" color="secundario">
              Desde
            </Texto>
          )}
          <Texto variante="titulo" style={{ fontSize: 26, lineHeight: 28 }}>
            {precio}
          </Texto>
        </View>
      </View>

      <View style={{ gap: espacio.xs, marginTop: -espacio.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.xs }}>
          <Ionicons name="calendar-outline" size={15} color={colores.textoSecundario} />
          <Texto variante="etiqueta" color="secundario">
            {formato.fecha(evento.fecha)}
          </Texto>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.xs }}>
          <Ionicons name="location-outline" size={15} color={colores.textoSecundario} />
          <Texto variante="etiqueta" color="secundario" numberOfLines={1} style={{ flexShrink: 1 }}>
            {evento.lugar}
          </Texto>
        </View>
        {organizador.puntaje !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.xs }}>
            <Ionicons name="star" size={14} color={colores.textoSecundario} />
            <Texto variante="etiqueta" color="secundario" numberOfLines={1} style={{ flexShrink: 1 }}>
              {formato.puntaje(organizador.puntaje)}, organiza {organizador.nombre}
            </Texto>
          </View>
        )}
      </View>
    </Pressable>
  );
}
