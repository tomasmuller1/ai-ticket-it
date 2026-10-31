import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { Ionicons } from "@expo/vector-icons";

import { Cargando, EstadoError, EstadoVacio, Texto } from "../../../components/ui";
import { useCompra, useEnviarMensaje, useMensajes } from "../../../hooks/compras";
import { AREA_TACTIL, espacio, fuentes, radio, useTema } from "../../../theme";

const LARGO_MAXIMO = 1000;
const hora = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  day: "numeric",
  month: "short",
});

function Burbuja({ mensaje }) {
  const { colores } = useTema();
  const propio = mensaje.esPropio;
  return (
    <View style={{ alignItems: propio ? "flex-end" : "flex-start", gap: 2 }}>
      {!propio && (
        <Texto variante="pequenio" color="secundario" style={{ marginLeft: espacio.sm }}>
          {mensaje.autor.nombre}
        </Texto>
      )}
      <View
        style={{
          maxWidth: "82%",
          paddingHorizontal: espacio.md,
          paddingVertical: espacio.sm + 2,
          borderRadius: radio.lg,
          borderBottomRightRadius: propio ? radio.sm : radio.lg,
          borderBottomLeftRadius: propio ? radio.lg : radio.sm,
          backgroundColor: propio ? colores.acento : colores.superficie,
        }}
      >
        <Texto style={{ color: propio ? colores.sobreAcento : colores.texto }}>{mensaje.mensaje}</Texto>
      </View>
      <Texto variante="pequenio" color="tenue" style={{ marginHorizontal: espacio.sm, fontSize: 11 }}>
        {hora.format(new Date(mensaje.enviado))}
      </Texto>
    </View>
  );
}

// CU5 y CU6: chat entre comprador y organizador dentro de la compra. Se actualiza solo cada 3 segundos.
export default function Chat() {
  const { id } = useLocalSearchParams();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const alturaHeader = useHeaderHeight();
  const lista = useRef(null);
  const compra = useCompra(id);
  const mensajes = useMensajes(id);
  const enviar = useEnviarMensaje(id);
  const [texto, setTexto] = useState("");

  const contenido = texto.trim();
  const puedeEnviar = contenido.length > 0 && !enviar.isPending;

  function mandar() {
    if (!puedeEnviar) return;
    enviar.mutate(contenido, { onSuccess: () => setTexto("") });
  }

  const titulo = compra.data?.evento.nombre ?? "Mensajes";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={alturaHeader}
    >
      <Stack.Screen options={{ title: titulo }} />
      {mensajes.isPending ? (
        <Cargando />
      ) : mensajes.isError ? (
        <EstadoError error={mensajes.error} onReintentar={mensajes.refetch} />
      ) : (
        <FlatList
          ref={lista}
          data={mensajes.data}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Burbuja mensaje={item} />}
          contentContainerStyle={{ padding: espacio.lg, gap: espacio.md, flexGrow: 1 }}
          onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <EstadoVacio
              icono="chatbubbles-outline"
              titulo="Empezá la conversación"
              descripcion="Preguntá lo que necesites sobre el evento, el acceso o cambios de fecha."
            />
          }
        />
      )}

      {enviar.isError && (
        <Texto variante="pequenio" color="peligro" style={{ paddingHorizontal: espacio.lg }}>
          {enviar.error.message}
        </Texto>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: espacio.sm,
          paddingHorizontal: espacio.lg,
          paddingTop: espacio.sm,
          paddingBottom: Math.max(insets.bottom, espacio.md),
          borderTopWidth: 1,
          borderTopColor: colores.borde,
          backgroundColor: colores.fondo,
        }}
      >
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribí un mensaje"
          placeholderTextColor={colores.textoTenue}
          accessibilityLabel="Mensaje"
          multiline
          maxLength={LARGO_MAXIMO}
          style={{
            flex: 1,
            minHeight: AREA_TACTIL,
            maxHeight: 120,
            paddingHorizontal: espacio.md,
            paddingVertical: espacio.sm + 2,
            borderRadius: radio.lg,
            borderWidth: 1,
            borderColor: colores.bordeCampo,
            backgroundColor: colores.superficie,
            fontFamily: fuentes.regular,
            fontSize: 16,
            color: colores.texto,
          }}
        />
        <Pressable
          onPress={mandar}
          disabled={!puedeEnviar}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          accessibilityState={{ disabled: !puedeEnviar }}
          style={({ pressed }) => ({
            width: AREA_TACTIL,
            height: AREA_TACTIL,
            borderRadius: radio.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: puedeEnviar
              ? pressed
                ? colores.acentoPresionado
                : colores.acento
              : colores.superficie,
          })}
        >
          <Ionicons
            name="arrow-up"
            size={22}
            color={puedeEnviar ? colores.sobreAcento : colores.textoTenue}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
