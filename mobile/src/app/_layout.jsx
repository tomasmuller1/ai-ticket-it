import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";
import { AppState, Platform } from "react-native";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from "@expo-google-fonts/geist";

import { SesionProvider, useSesion } from "../context/SesionContext";
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
  const { estado } = useSesion();
  const { colores, esOscuro } = useTema();

  // La splash se oculta recién cuando se sabe si hay sesión: así no "parpadea" el login.
  useEffect(() => {
    if (estado !== "cargando") SplashScreen.hideAsync();
  }, [estado]);

  if (estado === "cargando") return null;
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
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  if (!fuentesListas) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SesionProvider>
        <Navegacion />
      </SesionProvider>
    </QueryClientProvider>
  );
}
