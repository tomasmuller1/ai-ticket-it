import { Alert, Platform } from "react-native";

// Diálogo de confirmación nativo; en web (solo para desarrollo) usa window.confirm.
export function confirmar({ titulo, mensaje, accion, destructiva = false, alConfirmar }) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${titulo}\n\n${mensaje}`)) alConfirmar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: "Volver", style: "cancel" },
    { text: accion, style: destructiva ? "destructive" : "default", onPress: alConfirmar },
  ]);
}
