import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AREA_TACTIL, espacio, fuentes, radio, useTema } from "../../theme";
import { Texto } from "./Texto";

// Input con etiqueta visible siempre (no solo placeholder), ayuda y error debajo del campo.
export function Campo({ etiqueta, error, ayuda, secreto = false, style, ...props }) {
  const { colores } = useTema();
  const [enfocado, setEnfocado] = useState(false);
  const [oculto, setOculto] = useState(secreto);

  const colorBorde = error ? colores.peligro : enfocado ? colores.acento : colores.bordeCampo;

  return (
    <View style={[{ gap: espacio.xs }, style]}>
      <Texto variante="etiqueta">{etiqueta}</Texto>
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
          accessibilityLabel={etiqueta}
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
