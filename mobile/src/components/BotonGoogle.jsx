import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useSesion } from "../context/SesionContext";
import { useLoginGoogle } from "../hooks/useLoginGoogle";
import { espacio, useTema } from "../theme";
import { AvisoError, Boton, Texto } from "./ui";

// "Continuar con Google" con un separador arriba. No se muestra si el SSO no está disponible en esta
// plataforma o no hay credenciales: nunca un botón que no funciona.
export function BotonGoogle() {
  const { colores } = useTema();
  const { iniciarSesionConGoogle } = useSesion();
  const [error, setError] = useState(null);
  const [entrando, setEntrando] = useState(false);

  const alObtenerToken = useCallback(
    async (idToken) => {
      setEntrando(true);
      setError(null);
      try {
        await iniciarSesionConGoogle(idToken);
      } catch (e) {
        setError(e.message);
        setEntrando(false);
      }
    },
    [iniciarSesionConGoogle],
  );

  const google = useLoginGoogle({ alObtenerToken });
  if (!google.disponible) return null;

  return (
    <View style={{ gap: espacio.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.md }}>
        <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colores.bordeFuerte }} />
        <Texto variante="pequenio" color="secundario">
          o
        </Texto>
        <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colores.bordeFuerte }} />
      </View>
      <Boton
        titulo="Continuar con Google"
        icono="logo-google"
        variante="secundario"
        cargando={entrando}
        deshabilitado={!google.listo}
        onPress={() =>
          // En web el navegador puede bloquear la ventana de Google: se avisa en lugar de fallar.
          google
            .abrirGoogle()
            .catch(() =>
              setError("No pudimos abrir Google. Permití las ventanas emergentes y probá de nuevo."),
            )
        }
      />
      <AvisoError>{error}</AvisoError>
    </View>
  );
}
