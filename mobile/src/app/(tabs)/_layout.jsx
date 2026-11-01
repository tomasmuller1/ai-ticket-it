import { Tabs } from "expo-router";

import { BarraNavegacion } from "../../components/BarraNavegacion";
import { useTema } from "../../theme";

// El título es el que se ve en la píldora de la pestaña activa: corto para que entre en 360 pt.
const PESTANIAS = [
  { name: "index", title: "Explorar", icono: "compass" },
  { name: "favoritos", title: "Favoritos", icono: "heart" },
  { name: "compras", title: "Entradas", icono: "ticket" },
  { name: "organizador", title: "Eventos", icono: "calendar" },
  { name: "perfil", title: "Perfil", icono: "person" },
];

export default function TabsLayout() {
  const { colores } = useTema();
  return (
    <Tabs
      tabBar={(props) => <BarraNavegacion {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colores.fondo } }}
    >
      {PESTANIAS.map(({ name, title, icono }) => (
        <Tabs.Screen key={name} name={name} options={{ title, icono }} />
      ))}
    </Tabs>
  );
}
