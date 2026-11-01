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

// Troquel vertical: guiones y dos muescas (arriba y abajo) que dejan ver el fondo de la lista.
function TroquelVertical({ fondo }) {
  const { colores } = useTema();
  const muesca = {
    position: "absolute",
    left: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: fondo,
  };
  return (
    <View style={{ width: 0, alignItems: "center" }} importantForAccessibility="no-hide-descendants">
      <View style={{ position: "absolute", top: 14, bottom: 14, justifyContent: "space-between" }}>
        {Array.from({ length: 9 }, (_, i) => (
          <View
            key={i}
            style={{ width: 2, height: 5, borderRadius: 1, backgroundColor: colores.bordeFuerte }}
          />
        ))}
      </View>
      <View style={[muesca, { top: -8 }]} />
      <View style={[muesca, { bottom: -8 }]} />
    </View>
  );
}

// Una compra en un listado, como el talón de la entrada: la foto, el troquel y los datos. Con
// `mostrarComprador` (las compras de un evento, para su organizador) el título es quién compró: el evento
// es el mismo en todas.
export function CompraCard({ compra, onPress, mostrarComprador = false }) {
  const { colores } = useTema();
  const titulo = mostrarComprador ? compra.comprador.nombre : compra.evento.nombre;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        mostrarComprador
          ? `Compra de ${compra.comprador.nombre}: ${compra.cantidad} × ${compra.tipoEntrada.nombre}, ${formato.monto(compra.total)}. Estado: ${compra.estado.toLowerCase()}`
          : `${compra.evento.nombre}, ${formato.fecha(compra.evento.fecha)}. ${compra.cantidad} × ${compra.tipoEntrada.nombre}. Estado: ${compra.estado.toLowerCase()}`
      }
      style={({ pressed }) => ({
        flexDirection: "row",
        borderRadius: radio.md,
        backgroundColor: colores.superficieAlta,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <Image
        source={compra.evento.imagen}
        style={{ width: 96, backgroundColor: colores.imagenVacia }}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <TroquelVertical fondo={colores.fondo} />
      <View style={{ flex: 1, padding: espacio.md, paddingLeft: espacio.lg, gap: espacio.xs }}>
        <Texto variante="titulo" numberOfLines={2} style={{ fontSize: 24, lineHeight: 26 }}>
          {titulo}
        </Texto>
        <View>
          {!mostrarComprador && <Texto variante="etiqueta">{formato.fecha(compra.evento.fecha)}</Texto>}
          <Texto variante="pequenio" color="secundario" numberOfLines={1}>
            {compra.cantidad} × {compra.tipoEntrada.nombre}, {formato.monto(compra.total)}
          </Texto>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.sm, marginTop: espacio.xs }}>
          <BadgeEstado estado={compra.estado} />
          <DiasRestantes dias={compra.diasRestantes} />
        </View>
      </View>
    </Pressable>
  );
}
