import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { fuentes, useTema } from "../../theme";

const PESTANIAS = [
  { name: "index", title: "Explorar", icono: "search" },
  { name: "favoritos", title: "Favoritos", icono: "heart" },
  { name: "compras", title: "Mis entradas", icono: "ticket" },
  { name: "organizador", title: "Mis eventos", icono: "calendar" },
  { name: "perfil", title: "Perfil", icono: "person-circle" },
];

export default function TabsLayout() {
  const { colores } = useTema();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.acento,
        tabBarInactiveTintColor: colores.textoTenue,
        tabBarLabelStyle: { fontFamily: fuentes.media, fontSize: 11 },
        tabBarStyle: { backgroundColor: colores.fondo, borderTopColor: colores.borde },
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      {PESTANIAS.map(({ name, title, icono }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? icono : `${icono}-outline`} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
