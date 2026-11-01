import { View } from "react-native";

import { espacio, fuentes, radio } from "../theme";
import { Texto } from "./ui";

// Cada red tiene su color de tarjeta: como las fotos de los eventos, es contenido y no interfaz.
const COLORES_MARCA = {
  Visa: "#1A1F71",
  Mastercard: "#1C1B19",
  "American Express": "#1F5FA8",
};
const SIGLAS_MARCA = { Visa: "VISA", Mastercard: "MC", "American Express": "AMEX" };
const COLOR_GENERICO = "#4E4740";
const TINTA = "#FFFFFF";
const CHIP = "#D9C38A";

export const nombreTarjeta = (tarjeta) => `${tarjeta.marca} •••• ${tarjeta.ultimos4}`;

// La tarjeta dibujada: marca, número (o los últimos 4), titular y vencimiento. Se usa en vivo mientras
// se completa el formulario y para mostrar una tarjeta guardada.
export function VistaTarjeta({ marca, numero, ultimos4, titular, vencimiento }) {
  const fondo = COLORES_MARCA[marca] ?? COLOR_GENERICO;
  const numeroVisible = numero || (ultimos4 ? `•••• •••• •••• ${ultimos4}` : "•••• •••• •••• ••••");
  return (
    <View
      accessible
      accessibilityLabel={`Tarjeta ${marca ?? ""}${ultimos4 ? ` terminada en ${ultimos4}` : ""}`}
      style={{
        aspectRatio: 1.586,
        justifyContent: "space-between",
        padding: espacio.xl,
        borderRadius: radio.xl,
        backgroundColor: fondo,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ width: 40, height: 30, borderRadius: radio.sm, backgroundColor: CHIP }} />
        <Texto style={{ fontFamily: fuentes.negrita, fontSize: 16, color: TINTA }}>
          {marca ?? "Tarjeta"}
        </Texto>
      </View>
      <Texto
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontFamily: fuentes.media, fontSize: 21, letterSpacing: 2, color: TINTA }}
      >
        {numeroVisible}
      </Texto>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.md }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texto style={{ fontSize: 12, color: TINTA, opacity: 0.75 }}>Titular</Texto>
          <Texto numberOfLines={1} style={{ fontFamily: fuentes.media, fontSize: 14, color: TINTA }}>
            {titular || "Como figura en la tarjeta"}
          </Texto>
        </View>
        <View>
          <Texto style={{ fontSize: 12, color: TINTA, opacity: 0.75 }}>Vence</Texto>
          <Texto style={{ fontFamily: fuentes.media, fontSize: 14, color: TINTA }}>
            {vencimiento || "MM/AA"}
          </Texto>
        </View>
      </View>
    </View>
  );
}

// La tarjeta en miniatura, para las filas de una lista (hoja de pago, medios de pago del perfil).
export function MiniTarjeta({ marca }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: 48,
        height: 32,
        borderRadius: radio.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORES_MARCA[marca] ?? COLOR_GENERICO,
      }}
    >
      <Texto style={{ fontFamily: fuentes.negrita, fontSize: 11, letterSpacing: 0.5, color: TINTA }}>
        {SIGLAS_MARCA[marca] ?? "•••"}
      </Texto>
    </View>
  );
}
