import { Tabs } from "expo-router";

import { BarraNavegacion } from "../../components/BarraNavegacion";
import { useSesion } from "../../context/SesionContext";
import { useResumenNotificaciones } from "../../hooks/notificaciones";
import { textoBurbuja } from "../../utils/notificaciones";
import { esOrganizador } from "../../utils/roles";
import { useTema } from "../../theme";

// El título es el que se ve en la píldora de la pestaña activa: corto para que entre en 360 pt. Por eso la de
// notificaciones dice "Avisos"; el lector oye el nombre completo (`tabBarAccessibilityLabel`).
const opciones = (title, icono) => ({ title, icono });

// La burbuja muestra hasta "9+", pero el lector oye la cantidad exacta.
function opcionesDeAvisos(noLeidas) {
  return {
    ...opciones("Avisos", "notifications"),
    tabBarBadge: textoBurbuja(noLeidas),
    tabBarAccessibilityLabel: noLeidas ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones",
  };
}

// Cada tipo de cuenta tiene sus pestañas. El comprador: Explorar, Favoritos, Entradas, Avisos y Perfil. El
// organizador: Explorar (para mirar, sin comprar), Mis eventos, Avisos y Perfil. `Tabs.Protected` saca de la
// barra (y de la navegación) las del otro rol; el orden de la barra es el de declaración.
export default function TabsLayout() {
  const { colores } = useTema();
  const { usuario } = useSesion();
  const organizador = esOrganizador(usuario);
  // Se consulta cada 15 segundos mientras haya sesión, en cualquier pestaña.
  const resumen = useResumenNotificaciones();

  return (
    <Tabs
      tabBar={(props) => <BarraNavegacion {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colores.fondo } }}
    >
      <Tabs.Screen name="index" options={opciones("Explorar", "compass")} />
      <Tabs.Protected guard={!organizador}>
        <Tabs.Screen name="favoritos" options={opciones("Favoritos", "heart")} />
        <Tabs.Screen name="compras" options={opciones("Entradas", "ticket")} />
      </Tabs.Protected>
      <Tabs.Protected guard={organizador}>
        <Tabs.Screen name="organizador" options={opciones("Mis eventos", "calendar")} />
      </Tabs.Protected>
      <Tabs.Screen name="notificaciones" options={opcionesDeAvisos(resumen.data?.noLeidas)} />
      <Tabs.Screen name="perfil" options={opciones("Perfil", "person")} />
    </Tabs>
  );
}
