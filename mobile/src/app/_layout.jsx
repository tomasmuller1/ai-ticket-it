import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";
import { AppState, Platform, View } from "react-native";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  SofiaSans_400Regular,
  SofiaSans_500Medium,
  SofiaSans_600SemiBold,
  SofiaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/sofia-sans";
import { SofiaSansExtraCondensed_800ExtraBold } from "@expo-google-fonts/sofia-sans-extra-condensed";

import { AvisosProvider } from "../components/Avisos";
import { EstadoError } from "../components/ui";
import { SesionProvider, useSesion } from "../context/SesionContext";
import { TemaProvider } from "../context/TemaContext";
import { fuentes, useTema } from "../theme";

SplashScreen.preventAutoHideAsync();

// React Query no sabe por sí solo cuándo la app pasa a segundo plano en iOS/Android: se lo avisamos,
// así se pausan los refetch periódicos (como el chat) y se refresca todo al volver.
if (Platform.OS !== "web") {
  focusManager.setEventListener((alCambiar) => {
    const suscripcion = AppState.addEventListener("change", (estado) => alCambiar(estado === "active"));
    return () => suscripcion.remove();
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Un error 4xx no se arregla reintentando; un problema de red, quizás sí.
      retry: (intentos, error) => intentos < 2 && !(error?.status >= 400 && error?.status < 500),
    },
  },
});

function Navegacion() {
  const { estado, reintentar } = useSesion();
  const { colores, esOscuro, listo } = useTema();

  // La splash se oculta recién cuando se sabe si hay sesión y qué tema eligió la persona: así no
  // "parpadea" el login ni cambia el tema al abrir.
  useEffect(() => {
    if (estado !== "cargando" && listo) SplashScreen.hideAsync();
  }, [estado, listo]);

  if (estado === "cargando" || !listo) return null;
  if (estado === "sinConexion") {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colores.fondo }}>
        <EstadoError
          error={{
            message: "No pudimos conectarnos con AI Ticket It. Revisá tu conexión e intentá de nuevo.",
          }}
          onReintentar={reintentar}
        />
        <StatusBar style={esOscuro ? "light" : "dark"} />
      </View>
    );
  }
  const autenticado = estado === "autenticado";

  return (
    <>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colores.fondo },
          headerTintColor: colores.texto,
          headerTitleStyle: { fontFamily: fuentes.seminegrita },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colores.fondo },
        }}
      >
        <Stack.Protected guard={autenticado}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="evento/[id]/index" options={{ headerShown: false }} />
          <Stack.Screen name="evento/[id]/comprar" options={{ title: "Comprar entradas" }} />
          <Stack.Screen name="compra/[id]/index" options={{ title: "Tu entrada" }} />
          <Stack.Screen name="compra/[id]/chat" options={{ title: "Mensajes" }} />
          <Stack.Screen
            name="compra/[id]/resenia"
            options={{ title: "Calificar evento", presentation: "modal" }}
          />
          <Stack.Screen name="organizador/evento/[id]" options={{ title: "Tu evento" }} />
          <Stack.Screen name="organizador/evento/nuevo" options={{ title: "Nuevo evento" }} />
          <Stack.Screen name="perfil/editar" options={{ title: "Tus datos" }} />
          <Stack.Screen name="perfil/tarjetas/index" options={{ title: "Medios de pago" }} />
          <Stack.Screen name="perfil/tarjetas/nueva" options={{ title: "Nueva tarjeta" }} />
        </Stack.Protected>
        <Stack.Protected guard={!autenticado}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="registro" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style={esOscuro ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  // Ionicons.font hace falta en web; en iOS y Android los íconos ya vienen en Expo Go.
  const [fuentesListas] = useFonts({
    ...Ionicons.font,
    SofiaSans_400Regular,
    SofiaSans_500Medium,
    SofiaSans_600SemiBold,
    SofiaSans_700Bold,
    SofiaSansExtraCondensed_800ExtraBold,
  });

  if (!fuentesListas) return null;

  return (
    <TemaProvider>
      <QueryClientProvider client={queryClient}>
        <SesionProvider>
          <AvisosProvider>
            <Navegacion />
          </AvisosProvider>
        </SesionProvider>
      </QueryClientProvider>
    </TemaProvider>
  );
}
