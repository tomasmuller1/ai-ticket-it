import { Alert, Platform } from "react-native";

// Diálogo de confirmación nativo; en web (solo para desarrollo) usa window.confirm.
export function confirmar({ titulo, mensaje, accion, volver = "Volver", destructiva = false, alConfirmar }) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${titulo}\n\n${mensaje}`)) alConfirmar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: volver, style: "cancel" },
    { text: accion, style: destructiva ? "destructive" : "default", onPress: alConfirmar },
  ]);
}
