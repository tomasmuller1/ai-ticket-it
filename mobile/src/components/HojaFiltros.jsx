import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AREA_TACTIL, espacio, radio, useTema } from "../theme";
import { Boton, Chip, Texto } from "./ui";

// CU11: criterios de orden que ofrece la API (fecha, precio y puntaje del organizador).
export const ORDENES = [
  { id: "fecha-asc", orden: "fecha", dir: "asc", etiqueta: "Próximos primero" },
  { id: "precio-asc", orden: "precio", dir: "asc", etiqueta: "Menor precio" },
  { id: "precio-desc", orden: "precio", dir: "desc", etiqueta: "Mayor precio" },
  { id: "puntaje-desc", orden: "puntaje", dir: "desc", etiqueta: "Mejor puntuados" },
];

export const PRECIOS = [
  { id: "todos", etiqueta: "Cualquier precio" },
  { id: "gratis", etiqueta: "Gratis", precioMax: 0 },
  { id: "hasta-20", etiqueta: "Hasta $20.000", precioMax: 20000 },
  { id: "hasta-50", etiqueta: "Hasta $50.000", precioMax: 50000 },
  { id: "mas-50", etiqueta: "Más de $50.000", precioMin: 50000 },
];

function Opcion({ etiqueta, seleccionada, onPress }) {
  const { colores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada }}
      style={({ pressed }) => ({
        minHeight: AREA_TACTIL + 4,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: espacio.lg,
        borderRadius: radio.md,
        backgroundColor: pressed ? colores.superficie : "transparent",
      })}
    >
      <Texto variante={seleccionada ? "cuerpoFuerte" : "cuerpo"}>{etiqueta}</Texto>
      <Ionicons
        name={seleccionada ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={seleccionada ? colores.acento : colores.textoTenue}
      />
    </Pressable>
  );
}

export function HojaFiltros({ visible, ordenId, precioId, onCambiar, onCerrar }) {
  const { colores } = useTema();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: espacio.lg,
          }}
        >
          <Texto variante="titulo" accessibilityRole="header">
            Ordenar y filtrar
          </Texto>
          <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={12}>
            <Ionicons name="close" size={28} color={colores.texto} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl }}>
          <View style={{ gap: espacio.sm }} accessibilityRole="radiogroup">
            <Texto variante="overline" color="secundario">
              Ordenar por
            </Texto>
            {ORDENES.map((opcion) => (
              <Opcion
                key={opcion.id}
                etiqueta={opcion.etiqueta}
                seleccionada={opcion.id === ordenId}
                onPress={() => onCambiar({ ordenId: opcion.id })}
              />
            ))}
          </View>
          <View style={{ gap: espacio.md }}>
            <Texto variante="overline" color="secundario">
              Precio
            </Texto>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.sm }}>
              {PRECIOS.map((opcion) => (
                <Chip
                  key={opcion.id}
                  titulo={opcion.etiqueta}
                  seleccionado={opcion.id === precioId}
                  onPress={() => onCambiar({ precioId: opcion.id })}
                />
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={{ padding: espacio.lg, flexDirection: "row", gap: espacio.md }}>
          <Boton
            titulo="Limpiar"
            variante="secundario"
            style={{ flex: 1 }}
            onPress={() => onCambiar({ ordenId: ORDENES[0].id, precioId: PRECIOS[0].id })}
          />
          <Boton titulo="Ver resultados" style={{ flex: 2 }} onPress={onCerrar} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
