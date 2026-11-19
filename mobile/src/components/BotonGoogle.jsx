import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useSesion } from "../context/SesionContext";
import { useLoginGoogle } from "../hooks/useLoginGoogle";
import { espacio, useTema } from "../theme";
import { AvisoError, Boton, Texto } from "./ui";

// "Continuar con Google" con un separador arriba. No se muestra si el SSO no está disponible en esta
// plataforma o no hay credenciales: nunca un botón que no funciona. En el registro recibe el `rol` elegido
// (solo se usa si se crea la cuenta) y `antesDeAbrir`, que puede frenar la apertura si falta elegirlo.
export function BotonGoogle({ rol, antesDeAbrir = () => true }) {
  const { colores } = useTema();
  const { iniciarSesionConGoogle } = useSesion();
  const [error, setError] = useState(null);
  const [entrando, setEntrando] = useState(false);
  // El rol se lee de un ref: si cambiara la identidad de `alObtenerToken`, useLoginGoogle volvería a mandar
  // un token que ya se usó.
  const rolElegido = useRef(rol);
  useEffect(() => {
    rolElegido.current = rol;
  }, [rol]);

  const alObtenerToken = useCallback(
    async (idToken) => {
      setEntrando(true);
      setError(null);
      try {
        await iniciarSesionConGoogle(idToken, rolElegido.current);
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
        onPress={() => {
          if (!antesDeAbrir()) return;
          // En web el navegador puede bloquear la ventana de Google: se avisa en lugar de fallar.
          google
            .abrirGoogle()
            .catch(() =>
              setError("No pudimos abrir Google. Permití las ventanas emergentes y probá de nuevo."),
            );
        }}
      />
      <AvisoError>{error}</AvisoError>
    </View>
  );
}
