import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { formato } from "../utils/formato";
import { espacio, radio, useTema } from "../theme";
import { BadgeEstado, Texto } from "./ui";

// Días que faltan, destacado solo en compras CONFIRMADAS (CU1). Lo calcula el backend.
export function DiasRestantes({ dias }) {
  const { colores } = useTema();
  if (dias === null || dias === undefined) return null;
  const texto = dias === 0 ? "¡Es hoy!" : dias === 1 ? "Falta 1 día" : `Faltan ${dias} días`;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: espacio.xs,
        paddingHorizontal: espacio.sm + 2,
        paddingVertical: espacio.xs,
        borderRadius: radio.pill,
        backgroundColor: colores.acentoSuave,
      }}
    >
      <Ionicons name="hourglass-outline" size={14} color={colores.textoAcento} />
      <Texto variante="etiqueta" color="acento" style={{ fontSize: 13 }}>
        {texto}
      </Texto>
    </View>
  );
}

// Tarjeta tipo "entrada": imagen a la izquierda, datos a la derecha y un borde troquelado.
export function CompraCard({ compra, onPress, mostrarComprador = false }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${compra.evento.nombre}, ${compra.cantidad} ${compra.tipoEntrada.nombre}, estado ${compra.estado.toLowerCase()}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        borderRadius: radio.lg,
        borderWidth: 1,
        borderColor: colores.borde,
        backgroundColor: pressed ? colores.superficie : colores.fondo,
        overflow: "hidden",
      })}
    >
      <Image
        source={compra.evento.imagen}
        style={{ width: 92, backgroundColor: colores.imagenVacia }}
        contentFit="cover"
      />
      <View
        style={{
          width: 0,
          borderLeftWidth: 2,
          borderStyle: "dashed",
          borderColor: colores.bordeFuerte,
        }}
      />
      <View style={{ flex: 1, padding: espacio.md, gap: espacio.xs }}>
        <Texto variante="overline" color="secundario" style={{ fontSize: 11 }}>
          {formato.fecha(compra.evento.fecha)}
        </Texto>
        <Texto variante="cuerpoFuerte" numberOfLines={2}>
          {compra.evento.nombre}
        </Texto>
        <Texto variante="pequenio" color="secundario">
          {compra.cantidad} × {compra.tipoEntrada.nombre} · {formato.precio(compra.total)}
          {mostrarComprador ? ` · ${compra.comprador.nombre}` : ""}
        </Texto>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.sm, marginTop: espacio.xs }}>
          <BadgeEstado estado={compra.estado} />
          <DiasRestantes dias={compra.diasRestantes} />
        </View>
      </View>
    </Pressable>
  );
}
