import { router, Stack } from "expo-router";

import { EstadoVacio } from "../components/ui";

// Se ve al abrir un enlace a una ruta que no existe (por ejemplo, aiticketit://algo/viejo).
export default function NoEncontrada() {
  return (
    <>
      <Stack.Screen options={{ title: "No encontrada" }} />
      <EstadoVacio
        icono="compass-outline"
        titulo="Esta pantalla no existe"
        descripcion="Puede que el enlace esté mal escrito o sea viejo."
        accion={{ titulo: "Ir al inicio", onPress: () => router.replace("/") }}
      />
    </>
  );
}
