import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formato } from "../utils/formato";
import { etiquetaDeNotificacion, iconoDeNotificacion } from "../utils/notificaciones";
import { AREA_TACTIL, espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Una notificación de la lista. Las sin leer se destacan de tres maneras, para no depender del color: un
// escalón de tono de fondo, el título en negrita y el punto verde. El lector oye "Sin leer" al principio.
export function NotificacionItem({ notificacion, onPress }) {
  const { colores } = useTema();
  const { titulo, cuerpo, leida } = notificacion;
  const cuando = formato.haceCuanto(notificacion.fechaHora);
  const fondo = leida ? "transparent" : colores.superficieAlta;
  // El de un mensaje es un adelanto: el mensaje entero está en el chat que abre. El resto se lee completo,
  // porque el aviso es el único lugar donde está, como el motivo de un evento pospuesto o cancelado.
  const esAdelanto = notificacion.tipo === "MENSAJE_NUEVO";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiquetaDeNotificacion(notificacion, cuando)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        gap: espacio.md,
        // Con el margen de la lista, el ícono queda alineado con el título de la pantalla.
        paddingHorizontal: espacio.sm,
        paddingVertical: espacio.md,
        borderRadius: radio.md,
        backgroundColor: pressed ? colores.superficie : fondo,
      })}
    >
      <View
        style={{
          width: AREA_TACTIL,
          height: AREA_TACTIL,
          borderRadius: radio.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colores.superficie,
        }}
      >
        <Ionicons name={iconoDeNotificacion(notificacion.tipo)} size={22} color={colores.texto} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante={leida ? "cuerpo" : "cuerpoFuerte"}>{titulo}</Texto>
        <Texto variante="pequenio" color="secundario" numberOfLines={esAdelanto ? 2 : undefined}>
          {cuerpo}
        </Texto>
        <Texto variante="pequenio" color="tenue" style={{ marginTop: espacio.xs }}>
          {cuando}
        </Texto>
      </View>
      {!leida && (
        <View
          accessibilityLabel="Sin leer"
          style={{
            width: espacio.md,
            height: espacio.md,
            marginTop: espacio.sm,
            borderRadius: radio.pill,
            backgroundColor: colores.marca,
          }}
        />
      )}
    </Pressable>
  );
}
