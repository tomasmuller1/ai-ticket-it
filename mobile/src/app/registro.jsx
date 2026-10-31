import { useState } from "react";
import { Pressable, View } from "react-native";
import { Link } from "expo-router";

import { BotonGoogle } from "../components/BotonGoogle";
import { FormularioAuth } from "../components/FormularioAuth";
import { AvisoError, Boton, Campo, Texto } from "../components/ui";
import { useSesion } from "../context/SesionContext";
import { espacio } from "../theme";

const VACIO = { nombre: "", apellido: "", email: "", password: "" };

// Validación rápida en el dispositivo; la definitiva la hace el backend y se muestra campo por campo.
function validar(datos) {
  const errores = {};
  if (!datos.nombre.trim()) errores.nombre = "Ingresá tu nombre.";
  if (!datos.apellido.trim()) errores.apellido = "Ingresá tu apellido.";
  if (!/^\S+@\S+\.\S+$/.test(datos.email.trim())) errores.email = "Ingresá un email válido.";
  if (datos.password.length < 8 || !/[A-Za-z]/.test(datos.password) || !/[0-9]/.test(datos.password)) {
    errores.password = "Usá al menos 8 caracteres, con letras y números.";
  }
  return errores;
}

export default function Registro() {
  const { registrarse } = useSesion();
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const campo = (nombre) => ({
    value: datos[nombre],
    error: errores[nombre],
    onChangeText: (valor) => {
      setDatos((actual) => ({ ...actual, [nombre]: valor }));
      setErrores((actual) => ({ ...actual, [nombre]: undefined }));
    },
  });

  async function enviar() {
    const encontrados = validar(datos);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      await registrarse(datos);
    } catch (e) {
      const porCampo = Object.fromEntries(
        ["nombre", "apellido", "email", "password"].map((c) => [c, e.errorDe?.(c)]).filter(([, m]) => m),
      );
      if (e.codigo === "EMAIL_EN_USO") porCampo.email = e.message;
      setErrores(porCampo);
      if (Object.keys(porCampo).length === 0) setErrorGeneral(e.message);
      setEnviando(false);
    }
  }

  return (
    <FormularioAuth
      titulo="Creá tu cuenta"
      subtitulo="Comprá entradas, guardá favoritos y publicá tus propios eventos."
      pie={
        <View style={{ flexDirection: "row", justifyContent: "center", gap: espacio.xs }}>
          <Texto color="secundario">¿Ya tenés cuenta?</Texto>
          <Link href="/login" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Iniciar sesión con una cuenta existente"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <Texto variante="cuerpoFuerte" color="acento">
                Iniciá sesión
              </Texto>
            </Pressable>
          </Link>
        </View>
      }
    >
      <View style={{ flexDirection: "row", gap: espacio.md }}>
        <Campo etiqueta="Nombre" autoComplete="given-name" style={{ flex: 1 }} {...campo("nombre")} />
        <Campo etiqueta="Apellido" autoComplete="family-name" style={{ flex: 1 }} {...campo("apellido")} />
      </View>
      <Campo
        etiqueta="Email"
        placeholder="nombre@mail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        {...campo("email")}
      />
      <Campo
        etiqueta="Contraseña"
        secreto
        autoComplete="new-password"
        textContentType="newPassword"
        ayuda="Al menos 8 caracteres, con una letra y un número."
        {...campo("password")}
      />
      <AvisoError>{errorGeneral}</AvisoError>
      <Boton titulo="Crear cuenta" onPress={enviar} cargando={enviando} />
      <BotonGoogle />
    </FormularioAuth>
  );
}
