import { router } from "expo-router";

// Una pantalla abierta con un enlace no tiene a dónde volver: en ese caso va al inicio.
export function volver() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}
