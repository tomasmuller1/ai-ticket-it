import { Tabs } from "expo-router";

import { BarraNavegacion } from "../../components/BarraNavegacion";
import { useResumenNotificaciones } from "../../hooks/notificaciones";
import { textoBurbuja } from "../../utils/notificaciones";
import { useTema } from "../../theme";

// El título es el que se ve en la píldora de la pestaña activa: corto para que entre en 360 pt. Por eso la de
// notificaciones dice "Avisos"; el lector oye el nombre completo (`tabBarAccessibilityLabel`).
const PESTANIAS = [
  { name: "index", title: "Explorar", icono: "compass" },
  { name: "compras", title: "Entradas", icono: "ticket" },
  { name: "notificaciones", title: "Avisos", icono: "notifications" },
  { name: "organizador", title: "Eventos", icono: "calendar" },
  { name: "perfil", title: "Perfil", icono: "person" },
];

// La burbuja muestra hasta "9+", pero el lector oye la cantidad exacta.
function opcionesDeAvisos(noLeidas) {
  return {
    tabBarBadge: textoBurbuja(noLeidas),
    tabBarAccessibilityLabel: noLeidas ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones",
  };
}

export default function TabsLayout() {
  const { colores } = useTema();
  // Se consulta cada 15 segundos mientras haya sesión, en cualquier pestaña.
  const resumen = useResumenNotificaciones();
  const avisos = opcionesDeAvisos(resumen.data?.noLeidas);

  return (
    <Tabs
      tabBar={(props) => <BarraNavegacion {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colores.fondo } }}
    >
      {PESTANIAS.map(({ name, title, icono }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title, icono, ...(name === "notificaciones" && avisos) }}
        />
      ))}
    </Tabs>
  );
}
