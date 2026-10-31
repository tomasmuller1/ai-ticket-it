import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
  Outfit_900Black,
  useFonts,
} from "@expo-google-fonts/outfit";

import { SesionProvider, useSesion } from "../context/SesionContext";
import { useTema } from "../theme";

SplashScreen.preventAutoHideAsync();

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
          headerTitleStyle: { fontFamily: "Outfit_700Bold" },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colores.fondo },
        }}
      >
        <Stack.Protected guard={autenticado}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
    Outfit_900Black,
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
