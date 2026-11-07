import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { RequisitosContrasenia } from "../../components/RequisitosContrasenia";
import { AvisoError, Boton, Campo, LeyendaObligatorios, Texto } from "../../components/ui";
import { api } from "../../api/endpoints";
import { useSesion } from "../../context/SesionContext";
import { useFocoEnError } from "../../hooks/useFocoEnError";
import { espacio, radio, useTema } from "../../theme";

// Confirmación en línea, debajo del botón que la generó.
function Listo({ children }) {
  const { colores } = useTema();
  if (!children) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        gap: espacio.sm,
        alignItems: "center",
        padding: espacio.md,
        borderRadius: radio.md,
        backgroundColor: colores.superficieAlta,
      }}
    >
      <Ionicons name="checkmark-circle" size={20} color={colores.marca} />
      <Texto style={{ flex: 1 }}>{children}</Texto>
    </View>
  );
}

function Seccion({ titulo, descripcion, children }) {
  return (
    <View style={{ gap: espacio.lg }}>
      <View style={{ gap: espacio.xs }}>
        <Texto variante="subtitulo" accessibilityRole="header">
          {titulo}
        </Texto>
        {descripcion && <Texto color="secundario">{descripcion}</Texto>}
      </View>
      {children}
    </View>
  );
}

function DatosPersonales() {
  const { usuario, actualizarUsuario } = useSesion();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [apellido, setApellido] = useState(usuario.apellido);
  const [email, setEmail] = useState(usuario.email);
  const [error, setError] = useState(null);
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const { refDe, enfocarErrores } = useFocoEnError();

  const cambios = Object.fromEntries(
    Object.entries({ nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim() }).filter(
      ([campo, valor]) => valor !== usuario[campo],
    ),
  );
  const hayCambios = Object.keys(cambios).length > 0;

  async function guardar() {
    setGuardando(true);
    setError(null);
    setGuardado(false);
    try {
      actualizarUsuario(await api.usuarios.actualizar(cambios));
      setGuardado(true);
    } catch (e) {
      setError(e);
      enfocarErrores(e.codigo === "EMAIL_EN_USO" ? { email: e.message } : (e.porCampo?.() ?? {}));
    } finally {
      setGuardando(false);
    }
  }

  const deCampo = (campo) => error?.errorDe?.(campo);
  const general =
    error && !deCampo("nombre") && !deCampo("apellido") && !deCampo("email") ? error.message : null;

  return (
    <Seccion titulo="Tus datos">
      <LeyendaObligatorios />
      <Campo
        ref={refDe("nombre")}
        etiqueta="Nombre"
        obligatorio
        value={nombre}
        onChangeText={(v) => (setNombre(v), setGuardado(false))}
        autoComplete="given-name"
        error={deCampo("nombre")}
      />
      <Campo
        ref={refDe("apellido")}
        etiqueta="Apellido"
        obligatorio
        value={apellido}
        onChangeText={(v) => (setApellido(v), setGuardado(false))}
        autoComplete="family-name"
        error={deCampo("apellido")}
      />
      <Campo
        ref={refDe("email")}
        etiqueta="Email"
        obligatorio
        value={email}
        onChangeText={(v) => (setEmail(v), setGuardado(false))}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={deCampo("email") ?? (error?.codigo === "EMAIL_EN_USO" ? error.message : undefined)}
      />
      <AvisoError>{error?.codigo === "EMAIL_EN_USO" ? null : general}</AvisoError>
      <Boton titulo="Guardar cambios" onPress={guardar} cargando={guardando} deshabilitado={!hayCambios} />
      <Listo>{guardado ? "Guardamos tus datos." : null}</Listo>
    </Seccion>
  );
}

function Contrasenia() {
  const { usuario, cambiarContrasenia } = useSesion();
  const tieneContrasenia = usuario.tieneContrasenia !== false;
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState(null);
  const [cambiada, setCambiada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const { refDe, enfocarErrores } = useFocoEnError();

  async function cambiar() {
    setGuardando(true);
    setError(null);
    setCambiada(false);
    try {
      await cambiarContrasenia(tieneContrasenia ? { actual, nueva } : { nueva });
      setActual("");
      setNueva("");
      setCambiada(true);
    } catch (e) {
      setError(e);
      enfocarErrores(e.porCampo?.() ?? {});
    } finally {
      setGuardando(false);
    }
  }

  const deCampo = (campo) => error?.errorDe?.(campo);
  const general = error && !deCampo("actual") && !deCampo("nueva") ? error.message : null;

  return (
    <Seccion
      titulo="Contraseña"
      descripcion={
        tieneContrasenia
          ? "Al cambiarla cerramos la sesión en tus otros dispositivos."
          : "Tu cuenta usa Google. Elegí una contraseña si también querés entrar con tu email."
      }
    >
      {tieneContrasenia && (
        <Campo
          ref={refDe("actual")}
          etiqueta="Contraseña actual"
          value={actual}
          onChangeText={setActual}
          secreto
          autoComplete="current-password"
          textContentType="password"
          error={deCampo("actual")}
        />
      )}
      <Campo
        ref={refDe("nueva")}
        etiqueta="Contraseña nueva"
        value={nueva}
        onChangeText={setNueva}
        secreto
        autoComplete="new-password"
        textContentType="newPassword"
        error={deCampo("nueva")}
      />
      <RequisitosContrasenia valor={nueva} />
      <AvisoError>{general}</AvisoError>
      <Boton
        titulo={tieneContrasenia ? "Cambiar contraseña" : "Elegir contraseña"}
        variante="secundario"
        onPress={cambiar}
        cargando={guardando}
        deshabilitado={!nueva || (tieneContrasenia && !actual)}
      />
      <Listo>{cambiada ? "Listo. Cerramos la sesión en tus otros dispositivos." : null}</Listo>
    </Seccion>
  );
}

// Editar el nombre, el apellido, el email y la contraseña.
export default function EditarPerfil() {
  const { colores } = useTema();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: espacio.lg, gap: espacio.xxl, paddingBottom: espacio.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <DatosPersonales />
        <Contrasenia />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
