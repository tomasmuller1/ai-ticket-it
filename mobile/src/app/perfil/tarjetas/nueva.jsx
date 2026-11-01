import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";

import { useAvisos } from "../../../components/Avisos";
import { FormularioTarjeta } from "../../../components/FormularioTarjeta";
import { nombreTarjeta } from "../../../components/VistaTarjeta";
import { espacio, useTema } from "../../../theme";

export default function NuevaTarjeta() {
  const { colores } = useTema();
  const { avisar } = useAvisos();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: espacio.lg, paddingBottom: espacio.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <FormularioTarjeta
          onGuardada={(tarjeta) => {
            avisar({ tipo: "exito", titulo: "Guardaste la tarjeta", mensaje: nombreTarjeta(tarjeta) });
            router.back();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
