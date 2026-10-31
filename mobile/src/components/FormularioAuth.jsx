import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { espacio, radio, useTema } from "../theme";
import { Texto } from "./ui";

// Marco común de login y registro: marca arriba, formulario con scroll y el teclado sin tapar los campos.
export function FormularioAuth({ titulo, subtitulo, children, pie }) {
  const { colores } = useTema();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: espacio.xl,
            gap: espacio.xl,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: espacio.md }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radio.lg,
                backgroundColor: colores.acento,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate: "-8deg" }],
              }}
            >
              <Ionicons name="ticket" size={30} color={colores.sobreAcento} />
            </View>
            <Texto variante="overline" color="acento">
              AI Ticket It
            </Texto>
            <Texto variante="display" accessibilityRole="header">
              {titulo}
            </Texto>
            <Texto color="secundario">{subtitulo}</Texto>
          </View>
          <View style={{ gap: espacio.lg }}>{children}</View>
          {pie}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
