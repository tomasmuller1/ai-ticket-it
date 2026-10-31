import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { espacio, useTema } from "../theme";
import { Marca } from "./Marca";
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
            gap: espacio.xxl,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: espacio.xl }}>
            <Marca />
            <View style={{ gap: espacio.sm }}>
              <Texto variante="display" accessibilityRole="header">
                {titulo}
              </Texto>
              <Texto color="secundario">{subtitulo}</Texto>
            </View>
          </View>
          <View style={{ gap: espacio.lg }}>{children}</View>
          {pie}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
