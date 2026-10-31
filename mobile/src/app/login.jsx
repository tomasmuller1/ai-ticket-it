import { useState } from "react";
import { Pressable, View } from "react-native";
import { Link } from "expo-router";

import { FormularioAuth } from "../components/FormularioAuth";
import { AvisoError, Boton, Campo, Texto } from "../components/ui";
import { useSesion } from "../context/SesionContext";
import { espacio } from "../theme";

export default function Login() {
  const { iniciarSesion } = useSesion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!email.trim() || !password) {
      setError("Completá tu email y tu contraseña.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion({ email, password });
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <FormularioAuth
      titulo="Tu próxima salida empieza acá"
      subtitulo="Iniciá sesión para comprar entradas y seguir tus eventos."
      pie={
        <View style={{ flexDirection: "row", justifyContent: "center", gap: espacio.xs }}>
          <Texto color="secundario">¿No tenés cuenta?</Texto>
          <Link href="/registro" asChild>
            <Pressable accessibilityRole="link" hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
              <Texto variante="cuerpoFuerte" color="acento">
                Creala gratis
              </Texto>
            </Pressable>
          </Link>
        </View>
      }
    >
      <Campo
        etiqueta="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="nombre@mail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <Campo
        etiqueta="Contraseña"
        value={password}
        onChangeText={setPassword}
        secreto
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={enviar}
      />
      <AvisoError>{error}</AvisoError>
      <Boton titulo="Iniciar sesión" onPress={enviar} cargando={enviando} />
      {__DEV__ && (
        <Texto variante="pequenio" color="tenue" style={{ textAlign: "center" }}>
          Usuarios de prueba: sofia@aiticketit.com, lucia@aiticketit.com… · contraseña aiticketit123
        </Texto>
      )}
    </FormularioAuth>
  );
}
