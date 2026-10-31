import { View } from "react-native";

import { espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Medidor de vendidas sobre el cupo. Sigue la guía de dataviz: la pista es un tono más claro
// del mismo color que el relleno, los extremos van redondeados y los números van en color de
// texto (no en el color de la barra), así el dato se entiende sin depender del color.
export function Medidor({ etiqueta, valor, total, detalle, grosor = 8 }) {
  const { colores } = useTema();
  const proporcion = total > 0 ? Math.min(valor / total, 1) : 0;
  const porcentaje = Math.round(proporcion * 100);

  return (
    <View
      style={{ gap: espacio.sm - 2 }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${etiqueta}: ${valor} de ${total} vendidas`}
      accessibilityValue={{ min: 0, max: total, now: valor }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Texto variante="cuerpoFuerte">{etiqueta}</Texto>
        <Texto variante="pequenio" color="secundario">
          {valor} / {total} · {porcentaje}%
        </Texto>
      </View>
      <View
        style={{
          height: grosor,
          borderRadius: grosor / 2,
          backgroundColor: colores.acentoSuave,
          overflow: "hidden",
        }}
      >
        {proporcion > 0 && (
          <View
            style={{
              width: `${Math.max(proporcion * 100, 2)}%`,
              height: "100%",
              borderRadius: grosor / 2,
              backgroundColor: colores.acento,
            }}
          />
        )}
      </View>
      {detalle && (
        <Texto variante="pequenio" color="secundario">
          {detalle}
        </Texto>
      )}
    </View>
  );
}

// Número destacado con su etiqueta (stat tile).
export function Indicador({ etiqueta, valor }) {
  const { colores } = useTema();
  return (
    <View
      style={{
        flex: 1,
        gap: 2,
        padding: espacio.md,
        borderRadius: radio.md,
        backgroundColor: colores.superficie,
      }}
    >
      <Texto variante="pequenio" color="secundario">
        {etiqueta}
      </Texto>
      <Texto variante="subtitulo">{valor}</Texto>
    </View>
  );
}
