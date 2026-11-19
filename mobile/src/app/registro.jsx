import { useState } from "react";
import { Pressable, View } from "react-native";
import { Link } from "expo-router";

import { BotonGoogle } from "../components/BotonGoogle";
import { FormularioAuth } from "../components/FormularioAuth";
import { RequisitosContrasenia } from "../components/RequisitosContrasenia";
import { SelectorRol } from "../components/SelectorRol";
import { AvisoError, Boton, Campo, LeyendaObligatorios, Texto } from "../components/ui";
import { useSesion } from "../context/SesionContext";
import { useFocoEnError } from "../hooks/useFocoEnError";
import { contraseniaValida } from "../utils/contrasenia";
import { espacio } from "../theme";

const VACIO = { rol: null, nombre: "", apellido: "", email: "", password: "", confirmacion: "" };
const CAMPOS_API = ["rol", "nombre", "apellido", "email", "password"];
const FALTA_ROL = "Elegí si vas a comprar entradas u organizar eventos.";

// Validación rápida en el dispositivo; la definitiva la hace el backend y se muestra campo por campo.
function validar(datos) {
  const errores = {};
  if (!datos.rol) errores.rol = FALTA_ROL;
  if (!datos.nombre.trim()) errores.nombre = "Ingresá tu nombre.";
  if (!datos.apellido.trim()) errores.apellido = "Ingresá tu apellido.";
  if (!/^\S+@\S+\.\S+$/.test(datos.email.trim())) errores.email = "Ingresá un email válido.";
  if (!contraseniaValida(datos.password)) {
    errores.password = "Usá al menos 8 caracteres, con letras y números.";
  }
  if (!datos.confirmacion) {
    errores.confirmacion = "Repetí la contraseña.";
  } else if (datos.confirmacion !== datos.password) {
    errores.confirmacion = "Las contraseñas no coinciden.";
  }
  return errores;
}

export default function Registro() {
  const { registrarse } = useSesion();
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const { refDe, enfocarErrores } = useFocoEnError();

  const cambiar = (nombre, valor) => {
    setDatos((actual) => ({ ...actual, [nombre]: valor }));
    setErrores((actual) => ({ ...actual, [nombre]: undefined }));
  };

  const campo = (nombre) => ({
    ref: refDe(nombre),
    obligatorio: true,
    value: datos[nombre],
    error: errores[nombre],
    onChangeText: (valor) => cambiar(nombre, valor),
  });

  // Con Google la cuenta se crea con el rol elegido: sin rol, se pide antes de abrir Google.
  function puedeSeguirConGoogle() {
    if (datos.rol) return true;
    const encontrados = { rol: FALTA_ROL };
    setErrores(encontrados);
    enfocarErrores(encontrados);
    return false;
  }

  async function enviar() {
    const encontrados = validar(datos);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (Object.keys(encontrados).length > 0) {
      enfocarErrores(encontrados);
      return;
    }

    setEnviando(true);
    try {
      // La confirmación solo se controla acá: a la API va la contraseña una vez.
      const { confirmacion: _confirmacion, ...cuenta } = datos;
      await registrarse(cuenta);
    } catch (e) {
      const porCampo = Object.fromEntries(CAMPOS_API.map((c) => [c, e.errorDe?.(c)]).filter(([, m]) => m));
      if (e.codigo === "EMAIL_EN_USO") porCampo.email = e.message;
      setErrores(porCampo);
      enfocarErrores(porCampo);
      if (Object.keys(porCampo).length === 0) setErrorGeneral(e.message);
      setEnviando(false);
    }
  }

  return (
    <FormularioAuth
      titulo="Creá tu cuenta"
      subtitulo="Elegí cómo vas a usar la app y completá tus datos."
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
      <LeyendaObligatorios />
      <SelectorRol
        ref={refDe("rol")}
        valor={datos.rol}
        error={errores.rol}
        onCambiar={(rol) => cambiar("rol", rol)}
      />
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
        {...campo("password")}
      />
      <Campo
        etiqueta="Repetí la contraseña"
        secreto
        autoComplete="new-password"
        textContentType="newPassword"
        {...campo("confirmacion")}
      />
      {/* Los requisitos van después de los dos campos: repetir la contraseña queda justo debajo de la primera. */}
      <RequisitosContrasenia valor={datos.password} />
      <AvisoError>{errorGeneral}</AvisoError>
      <Boton titulo="Crear cuenta" onPress={enviar} cargando={enviando} />
      <BotonGoogle rol={datos.rol} antesDeAbrir={puedeSeguirConGoogle} />
    </FormularioAuth>
  );
}
