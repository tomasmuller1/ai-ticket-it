import { useState } from "react";
import { Alert, Platform, View } from "react-native";

import { Pantalla } from "../../components/Pantalla";
import { Boton, Texto } from "../../components/ui";
import { useSesion } from "../../context/SesionContext";
import { espacio, radio, useTema } from "../../theme";

function confirmar(titulo, mensaje, alConfirmar) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${titulo}\n${mensaje}`)) alConfirmar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: "Cancelar", style: "cancel" },
    { text: "Cerrar sesión", style: "destructive", onPress: alConfirmar },
  ]);
}

export default function Perfil() {
  const { usuario, cerrarSesion } = useSesion();
  const { colores } = useTema();
  const [saliendo, setSaliendo] = useState(false);
  const iniciales = `${usuario.nombre[0]}${usuario.apellido[0]}`.toUpperCase();

  return (
    <Pantalla titulo="Perfil">
      <View style={{ padding: espacio.lg, gap: espacio.xl }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: espacio.lg,
            padding: espacio.lg,
            borderRadius: radio.lg,
            backgroundColor: colores.superficie,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radio.pill,
              backgroundColor: colores.acento,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Texto variante="titulo" color="sobreAcento">
              {iniciales}
            </Texto>
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="subtitulo">
              {usuario.nombre} {usuario.apellido}
            </Texto>
            <Texto color="secundario" numberOfLines={1}>
              {usuario.email}
            </Texto>
          </View>
        </View>
        <Boton
          titulo="Cerrar sesión"
          variante="peligro"
          icono="log-out-outline"
          cargando={saliendo}
          onPress={() =>
            confirmar(
              "¿Cerrar sesión?",
              "Vas a tener que volver a ingresar tu email y contraseña.",
              async () => {
                setSaliendo(true);
                await cerrarSesion();
              },
            )
          }
        />
      </View>
    </Pantalla>
  );
}
