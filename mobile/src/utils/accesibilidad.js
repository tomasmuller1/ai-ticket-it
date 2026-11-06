import { AccessibilityInfo, Platform } from "react-native";

// accessibilityLiveRegion solo existe en Android: en iOS hay que pedir el anuncio. En Android no se pide
// para que no se lea dos veces.
export function anunciarEnIOS(mensaje) {
  if (mensaje && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(mensaje);
}

// Lleva el foco de VoiceOver o TalkBack a un elemento. react-native-web no lo implementa.
export function enfocarLector(nodo) {
  if (nodo) AccessibilityInfo.sendAccessibilityEvent?.(nodo, "focus");
}
