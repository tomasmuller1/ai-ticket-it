import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AREA_TACTIL, espacio, fuentes, radio, useTema } from "../../theme";
import { Texto } from "./Texto";

// Etiqueta visible de un campo. El asterisco es solo visual: el lector de pantalla oye "obligatorio".
export function EtiquetaCampo({ texto, obligatorio }) {
  return (
    <View style={{ flexDirection: "row", gap: espacio.xs }}>
      <Texto variante="etiqueta">{texto}</Texto>
      {obligatorio && (
        <Texto variante="etiqueta" color="peligro" accessibilityElementsHidden importantForAccessibility="no">
          *
        </Texto>
      )}
    </View>
  );
}

export function LeyendaObligatorios() {
  return (
    <Texto variante="pequenio" color="secundario">
      Los campos con * son obligatorios.
    </Texto>
  );
}

// Input con etiqueta visible siempre (no solo placeholder), ayuda y error debajo del campo. El error y la
// ayuda también quedan asociados al input, para que el lector de pantalla los lea junto con la etiqueta.
export function Campo({
  etiqueta,
  obligatorio = false,
  error,
  ayuda,
  secreto = false,
  style,
  ref,
  ...props
}) {
  const { colores } = useTema();
  const [enfocado, setEnfocado] = useState(false);
  const [oculto, setOculto] = useState(secreto);

  const colorBorde = error ? colores.peligro : enfocado ? colores.acento : colores.bordeCampo;

  return (
    <View style={[{ gap: espacio.xs }, style]}>
      <EtiquetaCampo texto={etiqueta} obligatorio={obligatorio} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: AREA_TACTIL + 4,
          borderRadius: radio.md,
          borderWidth: enfocado || error ? 2 : 1,
          borderColor: colorBorde,
          backgroundColor: colores.superficie,
          paddingHorizontal: espacio.md,
        }}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={obligatorio ? `${etiqueta}, obligatorio` : etiqueta}
          accessibilityHint={error ? `Error: ${error}` : ayuda}
          placeholderTextColor={colores.textoTenue}
          secureTextEntry={oculto}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          style={{
            flex: 1,
            fontFamily: fuentes.regular,
            fontSize: 16,
            color: colores.texto,
            paddingVertical: espacio.sm,
          }}
          {...props}
        />
        {secreto && (
          <Pressable
            onPress={() => setOculto((valor) => !valor)}
            accessibilityRole="button"
            accessibilityLabel={oculto ? "Mostrar contraseña" : "Ocultar contraseña"}
            hitSlop={12}
          >
            <Ionicons
              name={oculto ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={colores.textoSecundario}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={{ flexDirection: "row", gap: espacio.xs, alignItems: "center" }}>
          <Ionicons name="alert-circle" size={16} color={colores.peligro} />
          <Texto variante="pequenio" color="peligro" accessibilityLiveRegion="polite">
            {error}
          </Texto>
        </View>
      ) : (
        ayuda && (
          <Texto variante="pequenio" color="secundario">
            {ayuda}
          </Texto>
        )
      )}
    </View>
  );
}
